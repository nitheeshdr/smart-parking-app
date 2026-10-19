// Copy this file to secrets.h and fill in your values. secrets.h is git-ignored.
#pragma once

const char* WIFI_SSID     = "your-wifi-name";
const char* WIFI_PASSWORD = "your-wifi-password";

// Supabase project (Project Settings -> API). Use the ANON key, never the service_role key.
const char* SUPABASE_URL      = "https://YOUR-PROJECT-REF.supabase.co";
const char* SUPABASE_ANON_KEY = "your-anon-key";

// Staff account the board signs in as (must be admin, or the manager of the lot).
const char* SUPABASE_EMAIL    = "admin@smartparking.com";
const char* SUPABASE_PASSWORD = "your-password";

// parking_slots.id of the two sensor-monitored slots (S-001 / S-002).
const char* SLOT1_ID = "faf4d4ad-edac-40ab-b188-f583afedad28";
const char* SLOT2_ID = "c3595c66-5161-41c3-a4a2-fb7d46661792";
