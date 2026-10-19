/*
 * Smart Parking - ESP8266 (NodeMCU) firmware
 *
 *   IR entry (D1) / IR exit (D2)  -> directional gate logic -> servo (D5) + live car count
 *   IR slot 1 (D6) / IR slot 2 (D7) -> debounced occupancy -> Supabase RPC set_slot_occupancy()
 *
 * The database pushes every change to the admin, manager and customer apps over Supabase Realtime.
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

// ───────────── Timing ─────────────
const unsigned long FLOW_TIMEOUT      = 5000;   // max time for a car to cross both gate sensors
const unsigned long GATE_CLEAR_TIME   = 700;    // both gate sensors must stay clear this long before re-arming
const unsigned long GATE_OPEN_TIME    = 3000;   // servo stays open this long
const unsigned long SLOT_DEBOUNCE     = 1000;   // stable reading needed before a slot changes state
const unsigned long RETRY_DELAY       = 4000;   // wait after a failed request
const unsigned long RESYNC_INTERVAL   = 60000;  // re-send slot states periodically (self-healing)
const unsigned long WIFI_RETRY_DELAY  = 10000;
const int SERVO_CLOSED = 0;
const int SERVO_OPEN   = 90;

// ───────────── Gate state machine ─────────────
enum GateState { IDLE, ENTRY_WAIT_EXIT_SENSOR, EXIT_WAIT_ENTRY_SENSOR, CLEARING };
GateState gateState = IDLE;
unsigned long gateStateSince = 0;
unsigned long clearSince = 0;
int carCount = 0;
bool gateDirty = true;

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
  bool dirty;           // needs to be sent to Supabase
};
Slot slots[2] = {
  { SLOT1_ID, IR_SLOT1, "Slot 1", false, false, false, 0, true },
  { SLOT2_ID, IR_SLOT2, "Slot 2", false, false, false, 0, true },
};

// ───────────── Supabase session ─────────────
String accessToken;
unsigned long tokenRefreshAt = 0;   // millis() deadline
bool haveToken = false;
unsigned long nextRequestAt = 0;
unsigned long lastResync = 0;
unsigned long lastWifiAttempt = 0;

WiFiClientSecure tls;

// ───────────── Helpers ─────────────
bool reached(unsigned long deadline) { return (long)(millis() - deadline) >= 0; }

void openGate() {
  gateServo.write(SERVO_OPEN);
  gateOpen = true;
  gateOpenedAt = millis();
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
  http.setTimeout(8000);
  if (!http.begin(tls, String(SUPABASE_URL) + "/auth/v1/token?grant_type=password")) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  String body = String("{\"email\":\"") + SUPABASE_EMAIL + "\",\"password\":\"" + SUPABASE_PASSWORD + "\"}";
  int code = http.POST(body);
  if (code != 200) {
    Serial.printf("[Supabase] Sign-in failed (HTTP %d)\n", code);
    http.end();
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

// POST /rest/v1/rpc/<fn>. Returns true on success. Clears the token on 401 so the next try re-signs in.
bool callRpc(const char* fn, const String& json) {
  if (!haveToken || reached(tokenRefreshAt)) {
    if (!signIn()) return false;
  }
  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(tls, String(SUPABASE_URL) + "/rest/v1/rpc/" + fn)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + accessToken);
  int code = http.POST(json);
  String resp = http.getString();
  http.end();
  if (code == 401 || code == 403) { haveToken = false; Serial.printf("[Supabase] %s: auth rejected (%d)\n", fn, code); return false; }
  if (code < 200 || code >= 300) { Serial.printf("[Supabase] %s failed (HTTP %d) %s\n", fn, code, resp.c_str()); return false; }
  // Functions return {"status":"success"|"ignored"|"error", ...}
  if (resp.indexOf("\"error\"") >= 0) { Serial.printf("[Supabase] %s error: %s\n", fn, resp.c_str()); return false; }
  return true;
}

bool pushSlot(Slot& s) {
  String body = String("{\"p_slot_id\":\"") + s.id + "\",\"p_occupied\":" + (s.occupied ? "true" : "false") + "}";
  bool ok = callRpc("set_slot_occupancy", body);
  if (ok) Serial.printf("[Supabase] %s -> %s\n", s.name, s.occupied ? "occupied" : "available");
  return ok;
}

bool pushGate() {
  String body = String("{\"p_car_count\":") + carCount + ",\"p_gate_status\":\"" + (gateOpen ? "open" : "closed") + "\"}";
  return callRpc("set_gate_state", body);
}

// Sends at most one pending update per call; never while the gate is moving (keeps the servo on time).
void syncSupabase() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!reached(nextRequestAt)) return;
  if (gateOpen || gateState != IDLE) return;

  if (reached(lastResync + RESYNC_INTERVAL)) {
    lastResync = millis();
    for (Slot& s : slots) s.dirty = true;
    gateDirty = true;
  }
  for (Slot& s : slots) {
    if (!s.dirty) continue;
    if (pushSlot(s)) s.dirty = false; else nextRequestAt = millis() + RETRY_DELAY;
    return;
  }
  if (gateDirty) {
    if (pushGate()) gateDirty = false; else nextRequestAt = millis() + RETRY_DELAY;
  }
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
        gateDirty = true;
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
        gateDirty = true;
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
    s.dirty = true;
    Serial.printf("[Sensor] %s is now %s\n", s.name, s.occupied ? "OCCUPIED" : "AVAILABLE");
  }
}

// ───────────── Arduino ─────────────
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
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
  tls.setBufferSizes(1024, 512);

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  connectWifi();
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) { delay(300); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) Serial.println("\n[WiFi] Connected, IP " + WiFi.localIP().toString());
  else Serial.println("\n[WiFi] Not connected yet - will keep retrying in the background");
  lastResync = millis();
}

void loop() {
  bool entryBlocked = (digitalRead(IR_ENTRY) == LOW);
  bool exitBlocked  = (digitalRead(IR_EXIT) == LOW);

  updateGate(entryBlocked, exitBlocked);
  for (Slot& s : slots) updateSlot(s);

  // Non-blocking servo close
  if (gateOpen && millis() - gateOpenedAt >= GATE_OPEN_TIME) {
    gateServo.write(SERVO_CLOSED);
    gateOpen = false;
    Serial.println("[Gate] Closed");
  }

  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiAttempt > WIFI_RETRY_DELAY) {
    Serial.println("[WiFi] Lost connection, reconnecting");
    connectWifi();
  }
  syncSupabase();

  delay(20);
}
