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
    const { data: booking, error: bookingError } = await admin.from('bookings').select('id, customer_id, parking_slot_id, payment_status, booking_status, qr_token').eq('id', bookingId).single();
    if (bookingError || booking.customer_id !== user.id) throw new Error('Booking was not found.');
    if (booking.payment_status === 'paid' && booking.booking_status === 'confirmed') return Response.json({ success: true, qrToken: booking.qr_token }, { headers });
    if (booking.booking_status !== 'pending') throw new Error('This booking is no longer available for payment.');
    const qrToken = `PK-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const { error: updateError } = await admin.from('bookings').update({ payment_status: 'paid', booking_status: 'confirmed', qr_token: qrToken }).eq('id', bookingId);
    if (updateError) throw updateError;
    const { error: slotError } = await admin.from('parking_slots').update({ status: 'reserved' }).eq('id', booking.parking_slot_id);
    if (slotError) throw slotError;
    return Response.json({ success: true, qrToken }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Payment verification failed.' }, { status: 400, headers }); }
});
