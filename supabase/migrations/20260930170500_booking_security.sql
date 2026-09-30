-- The original slots policy intentionally omitted deletion. Managers may only
-- remove slots from lots they own.
CREATE POLICY "Managers can delete slots from their own lots" ON public.parking_slots
FOR DELETE USING (
  parking_lot_id IN (
    SELECT id FROM public.parking_lots
    WHERE manager_id IN (SELECT id FROM public.parking_managers WHERE user_id = auth.uid())
  )
);

-- Prevent callers from using the SECURITY DEFINER booking function for a
-- different customer or vehicle.
CREATE OR REPLACE FUNCTION public.create_booking_intent(
    p_customer_id UUID,
    p_parking_lot_id UUID,
    p_parking_slot_id UUID,
    p_vehicle_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_base_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
    v_conflicting_booking UUID;
    v_booking_id UUID;
    v_booking_ref TEXT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_customer_id THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'UNAUTHORIZED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.vehicles WHERE id = p_vehicle_id AND user_id = auth.uid()) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'INVALID_VEHICLE');
    END IF;
    PERFORM 1 FROM public.parking_slots WHERE id = p_parking_slot_id FOR UPDATE;
    SELECT id INTO v_conflicting_booking FROM public.bookings
    WHERE parking_slot_id = p_parking_slot_id AND date = p_date
      AND ((start_time <= p_start_time AND end_time > p_start_time) OR (start_time < p_end_time AND end_time >= p_end_time) OR (start_time >= p_start_time AND end_time <= p_end_time))
      AND booking_status IN ('pending', 'confirmed', 'active') LIMIT 1;
    IF v_conflicting_booking IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'BOOKING_CONFLICT', 'details', 'Slot is already booked for this time.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.parking_slots WHERE id = p_parking_slot_id AND parking_lot_id = p_parking_lot_id AND status IN ('available', 'reserved')) THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'SLOT_UNAVAILABLE');
    END IF;
    INSERT INTO public.bookings (customer_id, parking_lot_id, parking_slot_id, vehicle_id, date, start_time, end_time, duration_hours, base_amount, total_amount, payment_status, booking_status)
    VALUES (p_customer_id, p_parking_lot_id, p_parking_slot_id, p_vehicle_id, p_date, p_start_time, p_end_time, EXTRACT(EPOCH FROM (p_end_time - p_start_time))/3600, p_base_amount, p_base_amount, 'pending', 'pending')
    RETURNING id, booking_reference INTO v_booking_id, v_booking_ref;
    RETURN jsonb_build_object('status', 'success', 'booking_id', v_booking_id, 'booking_reference', v_booking_ref);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
