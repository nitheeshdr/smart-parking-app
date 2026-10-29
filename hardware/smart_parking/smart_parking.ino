/*
 * Smart Parking - ESP8266 (NodeMCU) firmware
 *
 *   IR entry (D1) / IR exit (D2)    -> directional gate logic -> servo (D5) + live car count
 *   IR slot 1 (D6) / IR slot 2 (D7) -> debounced occupancy
 *
 * Every change (slot state, gate open/closed, car count) is pushed to Supabase in ONE request
 * (RPC hardware_update) over a kept-open TLS connection, so it reaches the admin and customer apps
 * through Supabase Realtime within a fraction of a second.
 * Sensors are active LOW (LOW = obstacle detected).
 * Copy secrets.example.h to secrets.h and fill it in before building.
 */
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Servo.h>
#include "secrets.h"

// ───────────── Pins ─────────────
const int IR_ENTRY  = D1;
const int IR_EXIT   = D2;
const int IR_SLOT1  = D6;
const int IR_SLOT2  = D7;
const int SERVO_PIN = D5;

// ───────────── Timing (ms) ─────────────
const unsigned long FLOW_TIMEOUT      = 5000;   // max time for a car to cross both gate sensors
const unsigned long GATE_CLEAR_TIME   = 700;    // both gate sensors must stay clear this long before re-arming
const unsigned long GATE_OPEN_TIME    = 3000;   // servo stays open this long
const unsigned long SLOT_DEBOUNCE     = 300;    // stable reading needed before a slot changes state
const unsigned long RETRY_DELAY       = 2000;   // wait after a failed request
const unsigned long HEARTBEAT         = 15000;  // re-send full state (keeps the TLS session warm, self-heals)
const unsigned long WIFI_RETRY_DELAY  = 10000;
const int SERVO_CLOSED = 0;
const int SERVO_OPEN   = 90;

// ───────────── Gate state machine ─────────────
enum GateState { IDLE, ENTRY_WAIT_EXIT_SENSOR, EXIT_WAIT_ENTRY_SENSOR, CLEARING };
GateState gateState = IDLE;
unsigned long gateStateSince = 0;
unsigned long clearSince = 0;
int carCount = 0;

Servo gateServo;
bool gateOpen = false;
unsigned long gateOpenedAt = 0;

// ───────────── Slots ─────────────
struct Slot {
  const char* id;
  int pin;
  const char* name;
  bool occupied;        // confirmed (debounced) state
  bool pending;         // a different reading is being debounced
  bool pendingState;
  unsigned long pendingSince;
};
Slot slots[2] = {
  { SLOT1_ID, IR_SLOT1, "Slot 1", false, false, false, 0 },
  { SLOT2_ID, IR_SLOT2, "Slot 2", false, false, false, 0 },
};

// ───────────── Supabase session ─────────────
String accessToken;
unsigned long tokenRefreshAt = 0;   // millis() deadline
bool haveToken = false;
bool stateDirty = true;             // something changed and still has to be sent
unsigned long nextRequestAt = 0;
unsigned long lastPush = 0;
unsigned long lastWifiAttempt = 0;

WiFiClientSecure tls;

// ───────────── Helpers ─────────────
bool reached(unsigned long deadline) { return (long)(millis() - deadline) >= 0; }

void openGate() {
  gateServo.write(SERVO_OPEN);
  gateOpen = true;
  gateOpenedAt = millis();
  stateDirty = true;               // tell the apps the gate is open right away
}

void closeGate() {
  gateServo.write(SERVO_CLOSED);
  gateOpen = false;
  stateDirty = true;
  Serial.println("[Gate] Closed");
}

void setGateState(GateState next) {
  gateState = next;
  gateStateSince = millis();
}

// Extracts the value of a JSON key from a flat-ish response without needing a JSON library.
String jsonField(const String& body, const char* key) {
  String needle = String("\"") + key + "\":";
  int i = body.indexOf(needle);
  if (i < 0) return "";
  i += needle.length();
  while (i < (int)body.length() && body[i] == ' ') i++;
  if (body[i] == '"') {
    int end = body.indexOf('"', i + 1);
    return end < 0 ? "" : body.substring(i + 1, end);
  }
  int end = i;
  while (end < (int)body.length() && body[end] != ',' && body[end] != '}') end++;
  return body.substring(i, end);
}

// ───────────── Supabase calls ─────────────
bool signIn() {
  HTTPClient http;
  http.setReuse(true);
  http.setTimeout(10000);
  if (!http.begin(tls, String(SUPABASE_URL) + "/auth/v1/token?grant_type=password")) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  String body = String("{\"email\":\"") + SUPABASE_EMAIL + "\",\"password\":\"" + SUPABASE_PASSWORD + "\"}";
  int code = http.POST(body);
  if (code != 200) {
    Serial.printf("[Supabase] Sign-in failed (HTTP %d, %s, free heap %u)\n", code,
                  code < 0 ? HTTPClient::errorToString(code).c_str() : "server error", ESP.getFreeHeap());
    http.end();
    tls.stop();
    return false;
  }
  String resp = http.getString();
  http.end();
  accessToken = jsonField(resp, "access_token");
  long expiresIn = jsonField(resp, "expires_in").toInt();
  if (accessToken.length() == 0) { Serial.println("[Supabase] No access_token in response"); return false; }
  if (expiresIn <= 0) expiresIn = 3600;
  tokenRefreshAt = millis() + (unsigned long)(expiresIn * 800UL);  // refresh at 80% of lifetime
  haveToken = true;
  Serial.println("[Supabase] Signed in");
  return true;
}

// POST /rest/v1/rpc/<fn> on the kept-open TLS connection. Returns the HTTP code (<0 = transport error).
int postRpc(const char* fn, const String& json, String& resp) {
  HTTPClient http;
  http.setReuse(true);
  http.setTimeout(10000);
  if (!http.begin(tls, String(SUPABASE_URL) + "/rest/v1/rpc/" + fn)) return -1;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + accessToken);
  int code = http.POST(json);
  resp = code > 0 ? http.getString() : "";
  http.end();
  return code;
}

// Sends slots + gate counter in one request. Retries once on a dropped connection.
bool pushState() {
  if (!haveToken || reached(tokenRefreshAt)) {
    if (!signIn()) return false;
  }

  String body = String("{\"p_slots\":[");
  for (int i = 0; i < 2; i++) {
    if (i) body += ",";
    body += String("{\"id\":\"") + slots[i].id + "\",\"occupied\":" + (slots[i].occupied ? "true" : "false") + "}";
  }
  body += String("],\"p_car_count\":") + carCount + ",\"p_gate_status\":\"" + (gateOpen ? "open" : "closed") + "\"}";

  String resp;
  int code = postRpc("hardware_update", body, resp);
  if (code < 0) {                    // connection dropped (idle timeout etc.) -> reconnect and retry once
    tls.stop();
    code = postRpc("hardware_update", body, resp);
  }
  if (code == 401 || code == 403) { haveToken = false; Serial.printf("[Supabase] Auth rejected (%d)\n", code); return false; }
  if (code < 200 || code >= 300) {
    Serial.printf("[Supabase] Update failed (HTTP %d%s%s)\n", code, code < 0 ? " " : "", code < 0 ? HTTPClient::errorToString(code).c_str() : "");
    if (code < 0) tls.stop();
    return false;
  }
  if (resp.indexOf("\"error\"") >= 0) { Serial.printf("[Supabase] Update error: %s\n", resp.c_str()); return false; }
  Serial.printf("[Supabase] Synced  S1=%s S2=%s cars=%d gate=%s\n", slots[0].occupied ? "occ" : "free", slots[1].occupied ? "occ" : "free", carCount, gateOpen ? "open" : "closed");
  return true;
}

void syncSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (reached(lastPush + HEARTBEAT)) stateDirty = true;
  if (!stateDirty || !reached(nextRequestAt)) return;
  stateDirty = false;                // anything that changes while we send sets it again
  if (pushState()) lastPush = millis();
  else { stateDirty = true; nextRequestAt = millis() + RETRY_DELAY; }
}

// ───────────── Gate logic ─────────────
void updateGate(bool entryBlocked, bool exitBlocked) {
  switch (gateState) {
    case IDLE:
      if (entryBlocked && !exitBlocked) {            // car arrives at the entry sensor first -> coming in
        openGate();
        setGateState(ENTRY_WAIT_EXIT_SENSOR);
        Serial.println("[Gate] Entry: car at IR1, gate open, waiting for IR2");
      } else if (exitBlocked && !entryBlocked) {     // car arrives at the exit sensor first -> going out
        openGate();
        setGateState(EXIT_WAIT_ENTRY_SENSOR);
        Serial.println("[Gate] Exit: car at IR2, gate open, waiting for IR1");
      }
      break;

    case ENTRY_WAIT_EXIT_SENSOR:
      if (exitBlocked) {
        carCount++;
        stateDirty = true;
        Serial.printf("[Gate] Entry confirmed. Cars inside: %d\n", carCount);
        setGateState(CLEARING);
      } else if (millis() - gateStateSince > FLOW_TIMEOUT) {
        Serial.println("[Gate] Entry timed out (car backed away)");
        setGateState(CLEARING);
      }
      break;

    case EXIT_WAIT_ENTRY_SENSOR:
      if (entryBlocked) {
        if (carCount > 0) carCount--;
        stateDirty = true;
        Serial.printf("[Gate] Exit confirmed. Cars inside: %d\n", carCount);
        setGateState(CLEARING);
      } else if (millis() - gateStateSince > FLOW_TIMEOUT) {
        Serial.println("[Gate] Exit timed out (car backed away)");
        setGateState(CLEARING);
      }
      break;

    case CLEARING:
      // The car that just passed is usually still blocking a sensor. Re-arm only once both stay clear,
      // otherwise the same car would be counted again in the opposite direction.
      if (entryBlocked || exitBlocked) {
        clearSince = millis();
      } else if (millis() - clearSince >= GATE_CLEAR_TIME) {
        setGateState(IDLE);
      }
      break;
  }
}

// ───────────── Slot logic ─────────────
void updateSlot(Slot& s) {
  bool reading = (digitalRead(s.pin) == LOW);
  if (reading == s.occupied) { s.pending = false; return; }
  if (!s.pending || s.pendingState != reading) {
    s.pending = true;
    s.pendingState = reading;
    s.pendingSince = millis();
  } else if (millis() - s.pendingSince >= SLOT_DEBOUNCE) {
    s.occupied = reading;
    s.pending = false;
    stateDirty = true;
    nextRequestAt = 0;               // send immediately
    Serial.printf("[Sensor] %s is now %s\n", s.name, s.occupied ? "OCCUPIED" : "AVAILABLE");
  }
}

// ───────────── Arduino ─────────────
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);   // lowest latency
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[Init] Smart Parking starting");

  pinMode(IR_ENTRY, INPUT);
  pinMode(IR_EXIT, INPUT);
  for (Slot& s : slots) pinMode(s.pin, INPUT);

  gateServo.attach(SERVO_PIN, 500, 2400);
  gateServo.write(SERVO_CLOSED);

  // Start from the real sensor state so the first sync reports the truth.
  for (Slot& s : slots) s.occupied = (digitalRead(s.pin) == LOW);

  tls.setInsecure();               // no certificate pinning on the ESP8266
  // Do NOT shrink the TLS buffers: Supabase sends full-size TLS records, which makes the connection drop (HTTP -5).

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  connectWifi();
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) { delay(300); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) Serial.println("\n[WiFi] Connected, IP " + WiFi.localIP().toString());
  else Serial.println("\n[WiFi] Not connected yet - will keep retrying in the background");
  lastPush = millis();
}

void loop() {
  bool entryBlocked = (digitalRead(IR_ENTRY) == LOW);
  bool exitBlocked  = (digitalRead(IR_EXIT) == LOW);

  updateGate(entryBlocked, exitBlocked);
  for (Slot& s : slots) updateSlot(s);

  // Non-blocking servo close
  if (gateOpen && millis() - gateOpenedAt >= GATE_OPEN_TIME) closeGate();

  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiAttempt > WIFI_RETRY_DELAY) {
    Serial.println("[WiFi] Lost connection, reconnecting");
    connectWifi();
  }
  syncSupabase();

  delay(5);
}
