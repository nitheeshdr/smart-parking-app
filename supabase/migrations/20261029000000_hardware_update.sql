-- Idempotent patch for databases created before hardware_update() existed.
-- Without it the ESP8266 cannot push slot / gate (car in / out) changes, so the admin and customer apps never see them.
-- Safe to run on a fresh database too (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION hardware_update(p_slots JSONB, p_car_count INTEGER, p_gate_status TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item JSONB;
  v_new slot_status;
BEGIN
  IF NOT is_admin() THEN RETURN jsonb_build_object('status', 'error', 'message', 'Not allowed.'); END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_slots, '[]'::jsonb)) LOOP
    v_new := (CASE WHEN (v_item->>'occupied')::boolean THEN 'occupied' ELSE 'available' END)::slot_status;
    UPDATE parking_slots SET status = v_new
    WHERE id = (v_item->>'id')::uuid AND status NOT IN ('maintenance', 'disabled') AND status IS DISTINCT FROM v_new;
  END LOOP;

  UPDATE parking_system SET car_count = greatest(p_car_count, 0), gate_status = p_gate_status
  WHERE id = 1 AND (car_count IS DISTINCT FROM greatest(p_car_count, 0) OR gate_status IS DISTINCT FROM p_gate_status);

  RETURN jsonb_build_object('status', 'success');
END; $$;

REVOKE ALL ON FUNCTION hardware_update(JSONB, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION hardware_update(JSONB, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
