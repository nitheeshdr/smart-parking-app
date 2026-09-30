import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' };

/** Optional server entry point for clients that prefer an Edge Function to direct RPC booking. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const authorization = req.headers.get('Authorization'); if (!authorization) throw new Error('Authentication is required.');
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await client.auth.getUser(); if (authError || !user) throw new Error('Invalid session.');
    const { parkingLotId, parkingSlotId, vehicleId, date, startTime, endTime, baseAmount } = await req.json();
    if (!parkingLotId || !parkingSlotId || !vehicleId || !date || !startTime || !endTime || !baseAmount) throw new Error('Missing booking details.');
    const { data: vehicle, error: vehicleError } = await client.from('vehicles').select('id').eq('id', vehicleId).eq('user_id', user.id).single();
    if (vehicleError || !vehicle) throw new Error('Vehicle was not found.');
    const { data, error } = await client.rpc('create_booking_intent', { p_customer_id: user.id, p_parking_lot_id: parkingLotId, p_parking_slot_id: parkingSlotId, p_vehicle_id: vehicleId, p_date: date, p_start_time: startTime, p_end_time: endTime, p_base_amount: baseAmount });
    if (error) throw error;
    if (data?.status !== 'success') throw new Error(data?.details || data?.message || 'Unable to create booking.');
    return Response.json(data, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Unable to create booking.' }, { status: 400, headers }); }
});
