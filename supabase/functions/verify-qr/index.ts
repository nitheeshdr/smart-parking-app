import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const authorization = req.headers.get('Authorization'); if (!authorization) throw new Error('Authentication is required.');
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await client.auth.getUser(); if (authError || !user) throw new Error('Invalid session.');
    const { qrPayload } = await req.json(); if (!qrPayload?.trim()) throw new Error('Enter a ticket token.');
    const { data: manager, error: managerError } = await admin.from('parking_managers').select('id').eq('user_id', user.id).single(); if (managerError) throw new Error('Only parking managers can verify tickets.');
    const { data: lots, error: lotsError } = await admin.from('parking_lots').select('id').eq('manager_id', manager.id); if (lotsError) throw lotsError;
    const { data: booking, error: bookingError } = await admin.from('bookings').select('id, booking_reference, booking_status, payment_status, date, start_time, end_time, parking_lot_id, profiles(full_name), vehicles(vehicle_number), parking_slots(slot_number)').eq('qr_token', qrPayload.trim().toUpperCase()).in('parking_lot_id', lots.map((lot) => lot.id)).single();
    if (bookingError || !booking) throw new Error('No valid ticket was found for your parking lots.');
    if (booking.payment_status !== 'paid' || booking.booking_status !== 'confirmed') throw new Error(`This ticket cannot be checked in (${booking.booking_status}).`);
    return Response.json({ booking }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Ticket verification failed.' }, { status: 400, headers }); }
});
