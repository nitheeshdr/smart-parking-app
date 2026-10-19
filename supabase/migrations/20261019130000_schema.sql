-- Smart Parking: complete schema (tables, RLS, RPCs, realtime).
-- Hardware (ESP8266) -> set_slot_occupancy()/set_gate_state() -> Realtime -> admin and customer apps.

-- ───────────────────────── Types ─────────────────────────
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE slot_type AS ENUM ('regular', 'disabled', 'ev', 'premium', 'reserved');
CREATE TYPE vehicle_type AS ENUM ('bike', 'car', 'suv', 'ev');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE lot_status AS ENUM ('active', 'inactive', 'maintenance');
-- available / occupied are driven by the IR sensors; maintenance / disabled are set by staff.
CREATE TYPE slot_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance', 'disabled');

-- ───────────────────────── Tables ─────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parking_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  city TEXT NOT NULL,
  pincode TEXT NOT NULL,
  opening_time TIME NOT NULL DEFAULT '00:00',
  closing_time TIME NOT NULL DEFAULT '23:59:59',
  status lot_status NOT NULL DEFAULT 'active',
  total_capacity INTEGER NOT NULL DEFAULT 0,
  available_capacity INTEGER NOT NULL DEFAULT 0,
  visibility_range_km INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
  slot_number TEXT NOT NULL,
  slot_type slot_type NOT NULL DEFAULT 'regular',
  vehicle_type vehicle_type NOT NULL DEFAULT 'car',
  floor TEXT NOT NULL DEFAULT '1',
  status slot_status NOT NULL DEFAULT 'available',
  hourly_price NUMERIC(10, 2) NOT NULL CHECK (hourly_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parking_lot_id, slot_number)
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  vehicle_type vehicle_type NOT NULL DEFAULT 'car',
  vehicle_model TEXT,
  vehicle_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_number)
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parking_lot_id UUID NOT NULL REFERENCES parking_lots(id) ON DELETE CASCADE,
  parking_slot_id UUID NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(5, 2) NOT NULL,
  base_amount NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  booking_status booking_status NOT NULL DEFAULT 'pending',
  qr_token TEXT UNIQUE,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking_time CHECK (start_time < end_time)
);
CREATE INDEX bookings_slot_date_idx ON bookings (parking_slot_id, date);
CREATE INDEX bookings_customer_idx ON bookings (customer_id, created_at DESC);
CREATE INDEX bookings_lot_idx ON bookings (parking_lot_id, created_at DESC);
CREATE INDEX parking_slots_lot_idx ON parking_slots (parking_lot_id);

-- Live gate counters written by the ESP8266 (single row).
CREATE TABLE parking_system (
  id INTEGER PRIMARY KEY,
  car_count INTEGER NOT NULL DEFAULT 0 CHECK (car_count >= 0),
  gate_status TEXT NOT NULL DEFAULT 'closed',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO parking_system (id) VALUES (1);

-- ───────────────────────── Helpers ─────────────────────────
CREATE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lots_updated BEFORE UPDATE ON parking_lots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_slots_updated BEFORE UPDATE ON parking_slots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_system_updated BEFORE UPDATE ON parking_system FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE FUNCTION is_admin() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- The admin account runs every lot (kept as a function so policies/RPCs read clearly).
CREATE FUNCTION is_lot_staff(p_lot_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin();
$$;

-- Users cannot promote themselves or self-approve; SQL / service contexts (auth.uid() IS NULL) are allowed.
CREATE FUNCTION guard_profile_update() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_guard_profile BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION guard_profile_update();

-- New auth user -> customer profile. The admin role can only be granted from SQL.
CREATE FUNCTION handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'customer'
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keep each lot's capacity numbers in sync with its slots (fires on every sensor update).
CREATE FUNCTION refresh_lot_capacity() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lot UUID := COALESCE(NEW.parking_lot_id, OLD.parking_lot_id);
BEGIN
  UPDATE parking_lots SET
    total_capacity = (SELECT count(*) FROM parking_slots WHERE parking_lot_id = v_lot),
    available_capacity = (SELECT count(*) FROM parking_slots WHERE parking_lot_id = v_lot AND status = 'available')
  WHERE id = v_lot;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_slot_capacity AFTER INSERT OR UPDATE OF status OR DELETE ON parking_slots
FOR EACH ROW EXECUTE FUNCTION refresh_lot_capacity();

-- ───────────────────────── Row Level Security ─────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_system ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_select_admin ON profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY profiles_select_lot_customers ON profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = profiles.id AND is_lot_staff(b.parking_lot_id))
);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin_all ON profiles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- parking_lots
CREATE POLICY lots_select ON parking_lots FOR SELECT TO authenticated USING (status = 'active' OR is_admin());
CREATE POLICY lots_insert ON parking_lots FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY lots_update ON parking_lots FOR UPDATE TO authenticated USING (is_lot_staff(id)) WITH CHECK (is_lot_staff(id));
CREATE POLICY lots_delete ON parking_lots FOR DELETE TO authenticated USING (is_lot_staff(id));

-- parking_slots
CREATE POLICY slots_select ON parking_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY slots_insert ON parking_slots FOR INSERT TO authenticated WITH CHECK (is_lot_staff(parking_lot_id));
CREATE POLICY slots_update ON parking_slots FOR UPDATE TO authenticated USING (is_lot_staff(parking_lot_id)) WITH CHECK (is_lot_staff(parking_lot_id));
CREATE POLICY slots_delete ON parking_slots FOR DELETE TO authenticated USING (is_lot_staff(parking_lot_id));

-- vehicles
CREATE POLICY vehicles_own ON vehicles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY vehicles_staff_select ON vehicles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM bookings b WHERE b.vehicle_id = vehicles.id AND is_lot_staff(b.parking_lot_id))
);

-- bookings: read-only from the client; all changes go through the RPCs below.
CREATE POLICY bookings_select_own ON bookings FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY bookings_select_staff ON bookings FOR SELECT TO authenticated USING (is_lot_staff(parking_lot_id));

-- parking_system
CREATE POLICY system_select ON parking_system FOR SELECT TO authenticated USING (true);
CREATE POLICY system_admin_write ON parking_system FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Only read access for bookings: remove direct write grants (RPCs are SECURITY DEFINER).
-- (Applied in the Grants section below.)

-- Customers need to see which time windows are taken on a slot, without seeing who booked it.
CREATE FUNCTION slot_busy_windows(p_slot_id UUID, p_date DATE)
RETURNS TABLE (start_time TIME, end_time TIME) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.start_time, b.end_time FROM bookings b
  WHERE b.parking_slot_id = p_slot_id AND b.date = p_date AND b.booking_status IN ('pending', 'confirmed', 'active');
$$;

-- ───────────────────────── Booking RPCs ─────────────────────────
-- Create + (demo) pay for a booking atomically.
-- Returns {status:'success', booking_id, booking_reference, qr_token, amount} or {status:'error', message}.
CREATE FUNCTION book_slot(
  p_lot_id UUID, p_slot_id UUID, p_vehicle_id UUID, p_date DATE, p_start TIME, p_end TIME
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_slot parking_slots;
  v_lot parking_lots;
  v_hours NUMERIC;
  v_amount NUMERIC;
  v_id UUID;
  v_ref TEXT;
  v_qr TEXT;
  v_now_ist TIMESTAMP := now() AT TIME ZONE 'Asia/Kolkata';
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('status', 'error', 'message', 'Please sign in again.'); END IF;
  IF p_start >= p_end THEN RETURN jsonb_build_object('status', 'error', 'message', 'End time must be after the start time.'); END IF;
  IF (p_date + p_end) <= v_now_ist THEN RETURN jsonb_build_object('status', 'error', 'message', 'That time has already passed.'); END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = p_vehicle_id AND user_id = v_uid) THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Choose one of your vehicles.');
  END IF;

  SELECT * INTO v_lot FROM parking_lots WHERE id = p_lot_id;
  IF NOT FOUND OR v_lot.status <> 'active' THEN RETURN jsonb_build_object('status', 'error', 'message', 'This lot is not accepting bookings.'); END IF;
  IF p_start < v_lot.opening_time OR p_end > v_lot.closing_time THEN
    RETURN jsonb_build_object('status', 'error', 'message', format('This lot is open %s - %s.', to_char(v_lot.opening_time, 'HH24:MI'), to_char(v_lot.closing_time, 'HH24:MI')));
  END IF;

  SELECT * INTO v_slot FROM parking_slots WHERE id = p_slot_id AND parking_lot_id = p_lot_id FOR UPDATE;
  IF NOT FOUND OR v_slot.status IN ('maintenance', 'disabled') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'This slot is not available.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE parking_slot_id = p_slot_id AND date = p_date
      AND booking_status IN ('pending', 'confirmed', 'active')
      AND start_time < p_end AND end_time > p_start
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'This slot is already booked for that time.');
  END IF;

  v_hours := round(EXTRACT(EPOCH FROM (p_end - p_start)) / 3600.0, 2);
  v_amount := round(v_slot.hourly_price * v_hours, 2);
  v_qr := 'PK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO bookings (customer_id, parking_lot_id, parking_slot_id, vehicle_id, date, start_time, end_time,
                        duration_hours, base_amount, total_amount, payment_status, booking_status, qr_token)
  VALUES (v_uid, p_lot_id, p_slot_id, p_vehicle_id, p_date, p_start, p_end,
          v_hours, v_amount, v_amount, 'paid', 'confirmed', v_qr)
  RETURNING id, booking_reference INTO v_id, v_ref;

  RETURN jsonb_build_object('status', 'success', 'booking_id', v_id, 'booking_reference', v_ref, 'qr_token', v_qr, 'amount', v_amount);
END; $$;

CREATE FUNCTION cancel_booking(p_booking_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id AND (customer_id = auth.uid() OR is_lot_staff(parking_lot_id)) FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'error', 'message', 'Booking not found.'); END IF;
  IF v_b.booking_status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Only upcoming bookings can be cancelled.');
  END IF;
  UPDATE bookings SET booking_status = 'cancelled',
    payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded'::payment_status ELSE payment_status END
  WHERE id = p_booking_id;
  RETURN jsonb_build_object('status', 'success');
END; $$;

-- Staff: look up a ticket by its QR token / booking reference (only for lots they run).
CREATE FUNCTION verify_ticket(p_token TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b RECORD;
BEGIN
  SELECT b.id, b.booking_reference, b.booking_status, b.payment_status, b.date, b.start_time, b.end_time,
         b.parking_lot_id, l.name AS lot_name, s.slot_number, v.vehicle_number, p.full_name AS customer_name
  INTO v_b
  FROM bookings b
  JOIN parking_lots l ON l.id = b.parking_lot_id
  JOIN parking_slots s ON s.id = b.parking_slot_id
  JOIN vehicles v ON v.id = b.vehicle_id
  JOIN profiles p ON p.id = b.customer_id
  WHERE (b.qr_token = upper(trim(p_token)) OR b.booking_reference = upper(trim(p_token))) AND is_lot_staff(b.parking_lot_id);
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'error', 'message', 'No ticket found for your lots.'); END IF;
  RETURN jsonb_build_object('status', 'success', 'booking', to_jsonb(v_b));
END; $$;

CREATE FUNCTION check_in_booking(p_booking_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR NOT is_lot_staff(v_b.parking_lot_id) THEN RETURN jsonb_build_object('status', 'error', 'message', 'Booking not found.'); END IF;
  IF v_b.booking_status <> 'confirmed' OR v_b.payment_status <> 'paid' THEN
    RETURN jsonb_build_object('status', 'error', 'message', format('Cannot check in a %s booking.', v_b.booking_status));
  END IF;
  UPDATE bookings SET booking_status = 'active', checked_in_at = now() WHERE id = p_booking_id;
  RETURN jsonb_build_object('status', 'success');
END; $$;

CREATE FUNCTION check_out_booking(p_booking_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_b bookings;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR NOT is_lot_staff(v_b.parking_lot_id) THEN RETURN jsonb_build_object('status', 'error', 'message', 'Booking not found.'); END IF;
  IF v_b.booking_status <> 'active' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Only checked-in vehicles can be checked out.');
  END IF;
  UPDATE bookings SET booking_status = 'completed', checked_out_at = now() WHERE id = p_booking_id;
  RETURN jsonb_build_object('status', 'success');
END; $$;

-- ───────────────────────── Hardware RPCs (called by the ESP8266) ─────────────────────────
-- Sets a slot occupied/available from the IR sensor. Slots under maintenance / disabled are left alone.
CREATE FUNCTION set_slot_occupancy(p_slot_id UUID, p_occupied BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slot parking_slots;
BEGIN
  SELECT * INTO v_slot FROM parking_slots WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND OR NOT is_lot_staff(v_slot.parking_lot_id) THEN RETURN jsonb_build_object('status', 'error', 'message', 'Slot not found.'); END IF;
  IF v_slot.status IN ('maintenance', 'disabled') THEN RETURN jsonb_build_object('status', 'ignored', 'slot_status', v_slot.status); END IF;
  UPDATE parking_slots SET status = CASE WHEN p_occupied THEN 'occupied'::slot_status ELSE 'available'::slot_status END
  WHERE id = p_slot_id;
  RETURN jsonb_build_object('status', 'success', 'slot_status', CASE WHEN p_occupied THEN 'occupied' ELSE 'available' END);
END; $$;

CREATE FUNCTION set_gate_state(p_car_count INTEGER, p_gate_status TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RETURN jsonb_build_object('status', 'error', 'message', 'Not allowed.'); END IF;
  UPDATE parking_system SET car_count = greatest(p_car_count, 0), gate_status = p_gate_status WHERE id = 1;
  RETURN jsonb_build_object('status', 'success');
END; $$;

-- ───────────────────────── Grants ─────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- bookings are written only through the RPCs above.
REVOKE INSERT, UPDATE, DELETE ON bookings FROM authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin(), is_lot_staff(UUID), slot_busy_windows(UUID, DATE),
  book_slot(UUID, UUID, UUID, DATE, TIME, TIME), cancel_booking(UUID), verify_ticket(TEXT),
  check_in_booking(UUID), check_out_booking(UUID), set_slot_occupancy(UUID, BOOLEAN),
  set_gate_state(INTEGER, TEXT) TO authenticated;

-- ───────────────────────── Realtime ─────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['parking_slots', 'parking_lots', 'bookings', 'parking_system', 'profiles']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
