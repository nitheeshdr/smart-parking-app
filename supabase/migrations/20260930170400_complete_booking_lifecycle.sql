-- Keep a lot's headline capacity in sync with its concrete parking slots.
CREATE OR REPLACE FUNCTION public.refresh_parking_lot_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_id UUID := COALESCE(NEW.parking_lot_id, OLD.parking_lot_id);
BEGIN
  UPDATE public.parking_lots
  SET total_capacity = (SELECT count(*) FROM public.parking_slots WHERE parking_lot_id = v_lot_id),
      available_capacity = (SELECT count(*) FROM public.parking_slots WHERE parking_lot_id = v_lot_id AND status = 'available')
  WHERE id = v_lot_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS refresh_lot_capacity_from_slots ON public.parking_slots;
CREATE TRIGGER refresh_lot_capacity_from_slots
AFTER INSERT OR UPDATE OF status OR DELETE ON public.parking_slots
FOR EACH ROW EXECUTE FUNCTION public.refresh_parking_lot_capacity();

-- New manager accounts receive the required manager record at the same time as their profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role);
  v_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User');
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (NEW.id, v_name, NEW.email, NEW.raw_user_meta_data->>'avatar_url', v_role);

  IF v_role = 'parking_manager' THEN
    INSERT INTO public.parking_managers (user_id, business_name, business_phone)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_name', ''), v_name || ' Parking'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'business_phone', ''), 'Not provided')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The customer app calls this transactional function after a vehicle has been selected.
GRANT EXECUTE ON FUNCTION public.create_booking_intent(UUID, UUID, UUID, UUID, DATE, TIME, TIME, DECIMAL) TO authenticated;
