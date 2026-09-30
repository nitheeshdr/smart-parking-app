import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Content-Type': 'application/json' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const authorization = req.headers.get('Authorization'); if (!authorization) throw new Error('Authentication is required.');
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await client.auth.getUser(); if (authError || !user) throw new Error('Invalid session.');
    const { bookingId } = await req.json(); if (!bookingId) throw new Error('A booking id is required.');
    const { data: manager, error: managerError } = await admin.from('parking_managers').select('id').eq('user_id', user.id).single(); if (managerError) throw new Error('Only parking managers can check in vehicles.');
    const { data: booking, error: bookingError } = await admin.from('bookings').select('id, parking_lot_id, parking_slot_id, booking_status, payment_status, parking_lots!inner(manager_id)').eq('id', bookingId).eq('parking_lots.manager_id', manager.id).single();
    if (bookingError || !booking) throw new Error('Booking was not found for your parking lot.');
    if (booking.payment_status !== 'paid' || booking.booking_status !== 'confirmed') throw new Error('Only paid, confirmed bookings can be checked in.');
    const { error: bookingUpdateError } = await admin.from('bookings').update({ booking_status: 'active', checked_in_at: new Date().toISOString() }).eq('id', booking.id); if (bookingUpdateError) throw bookingUpdateError;
    const { error: slotUpdateError } = await admin.from('parking_slots').update({ status: 'occupied' }).eq('id', booking.parking_slot_id); if (slotUpdateError) throw slotUpdateError;
    return Response.json({ success: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Check-in failed.' }, { status: 400, headers }); }
});
