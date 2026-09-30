-- Booking Functions and Transaction Logic

-- Function to atomically create a booking intent
CREATE OR REPLACE FUNCTION create_booking_intent(
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
    -- 1. Check for conflicts and lock rows using SELECT ... FOR UPDATE
    -- We want to ensure no other booking exists for the same slot that overlaps
    -- We lock the slot record first to prevent deadlocks
    PERFORM 1 FROM parking_slots WHERE id = p_parking_slot_id FOR UPDATE;

    SELECT id INTO v_conflicting_booking
    FROM bookings
    WHERE parking_slot_id = p_parking_slot_id
      AND date = p_date
      AND (
          (start_time <= p_start_time AND end_time > p_start_time) OR
          (start_time < p_end_time AND end_time >= p_end_time) OR
          (start_time >= p_start_time AND end_time <= p_end_time)
      )
      AND booking_status IN ('pending', 'confirmed', 'active')
    LIMIT 1;

    IF v_conflicting_booking IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'BOOKING_CONFLICT', 'details', 'Slot is already booked for this time.');
    END IF;

    -- 2. Check if the slot actually exists and is not disabled/maintenance
    IF NOT EXISTS (SELECT 1 FROM parking_slots WHERE id = p_parking_slot_id AND status IN ('available', 'reserved')) THEN
         RETURN jsonb_build_object('status', 'error', 'message', 'SLOT_UNAVAILABLE');
    END IF;

    -- 3. Create the booking intent
    INSERT INTO bookings (
        customer_id, parking_lot_id, parking_slot_id, vehicle_id, 
        date, start_time, end_time, duration_hours, base_amount, total_amount, payment_status, booking_status
    ) VALUES (
        p_customer_id, p_parking_lot_id, p_parking_slot_id, p_vehicle_id,
        p_date, p_start_time, p_end_time,
        EXTRACT(EPOCH FROM (p_end_time - p_start_time))/3600,
        p_base_amount, p_base_amount, 'pending', 'pending'
    ) RETURNING id, booking_reference INTO v_booking_id, v_booking_ref;

    RETURN jsonb_build_object(
        'status', 'success', 
        'booking_id', v_booking_id, 
        'booking_reference', v_booking_ref
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
