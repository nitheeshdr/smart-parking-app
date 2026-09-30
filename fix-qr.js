import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fixQR() {
  const email = 'customer@smartparking.com';
  const password = 'password123';
  
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) return console.error('Auth error:', authErr);
  
  const userId = authData.user.id;
  
  const { data: bookings } = await supabase.from('bookings').select('id, qr_token').eq('customer_id', userId);
  for (const booking of bookings || []) {
    if (!booking.qr_token) {
      const qrToken = `BKG-${booking.id.split('-')[0].toUpperCase()}-OK`;
      await supabase.from('bookings').update({ qr_token: qrToken }).eq('id', booking.id);
      console.log(`Updated QR token for booking ${booking.id}`);
    }
  }
  console.log('All QR tokens updated.');
}

fixQR();
