import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fixPayment() {
  const email = 'customer@smartparking.com';
  const password = 'password123';
  
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) return console.error('Auth error:', authErr);
  
  const userId = authData.user.id;
  
  const { data: bookings } = await supabase.from('bookings').select('*').eq('customer_id', userId);
  for (const booking of bookings || []) {
    await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', booking.id);
  }
  console.log('Payment status updated to paid for all bookings.');
}

fixPayment();
