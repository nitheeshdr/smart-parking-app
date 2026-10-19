-- Seed: the admin (runs the lot), one customer, the lot, and the 2 hardware slots.
-- Both accounts use the password "password123" - change it before going public.

DO $$
DECLARE
  v_admin    UUID := gen_random_uuid();
  v_customer UUID := gen_random_uuid();
  v_lot      UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated', 'admin@smartparking.com',
     extensions.crypt('password123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Lot Admin"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_customer, 'authenticated', 'authenticated', 'customer@smartparking.com',
     extensions.crypt('password123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Customer"}', now(), now(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  SELECT gen_random_uuid(), u.id, u.id::text,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
  FROM auth.users u WHERE u.id IN (v_admin, v_customer);

  -- Admin cannot be chosen at sign-up, so set it here (auth.uid() is NULL in SQL, which the guard allows).
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin;

  INSERT INTO public.vehicles (user_id, vehicle_number, vehicle_type, vehicle_model, vehicle_color)
  VALUES (v_customer, 'TN01AB1234', 'car', 'Hatchback', 'White');

  INSERT INTO public.parking_lots (id, name, description, address, latitude, longitude, city, pincode, opening_time, closing_time, status)
  VALUES (
    v_lot, 'Vels clg lot', 'Sensor-monitored campus parking with an automatic gate.',
    'Vels University, Pallavaram', 12.9487, 80.1408, 'Chennai', '600117', '00:00', '23:59:59', 'active'
  );

  -- Fixed ids: these must match SLOT1_ID / SLOT2_ID in hardware/smart_parking/secrets.h
  INSERT INTO public.parking_slots (id, parking_lot_id, slot_number, slot_type, vehicle_type, floor, status, hourly_price)
  VALUES
    ('faf4d4ad-edac-40ab-b188-f583afedad28', v_lot, 'S-001', 'regular', 'car', '1', 'available', 20),
    ('c3595c66-5161-41c3-a4a2-fb7d46661792', v_lot, 'S-002', 'regular', 'car', '1', 'available', 20);
END $$;
