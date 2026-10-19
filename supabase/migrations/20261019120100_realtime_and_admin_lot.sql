-- Publish live tables to Supabase Realtime (idempotent).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['parking_slots', 'parking_lots', 'bookings', 'parking_system']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Make the admin account the manager of the hardware-backed lot (S-001 / S-002 sensors).
DO $$
DECLARE
  v_admin_id UUID;
  v_manager_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles WHERE email = 'admin@smartparking.com' AND role = 'admin';
  IF v_admin_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_manager_id FROM public.parking_managers WHERE user_id = v_admin_id;
  IF v_manager_id IS NULL THEN
    INSERT INTO public.parking_managers (user_id, business_name, business_phone, verification_status)
    VALUES (v_admin_id, 'System Admin', '+910000000000', 'approved')
    RETURNING id INTO v_manager_id;
  END IF;

  UPDATE public.parking_lots
  SET manager_id = v_manager_id
  WHERE id IN (
    SELECT parking_lot_id FROM public.parking_slots
    WHERE id IN ('faf4d4ad-edac-40ab-b188-f583afedad28', 'c3595c66-5161-41c3-a4a2-fb7d46661792')
  );
END $$;
