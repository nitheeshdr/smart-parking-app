import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fixBookings() {
  const email = 'customer@smartparking.com';
  const password = 'password123';
  
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) return console.error('Auth error:', authErr);
  
  const userId = authData.user.id;
  console.log('Logged in as', email);

  // Get all bookings for this user
  const { data: bookings, error: bErr } = await supabase.from('bookings').select('*').eq('customer_id', userId);
  if (bErr || !bookings) return console.error('Error fetching bookings:', bErr);

  console.log(`Found ${bookings.length} bookings for user.`);

  for (const booking of bookings) {
    if (booking.booking_status !== 'completed') {
      console.log(`Updating booking ${booking.id} to completed...`);
      await supabase.from('bookings').update({ booking_status: 'completed' }).eq('id', booking.id);
    }
    
    // Make sure the slot is occupied
    if (booking.parking_slot_id) {
      console.log(`Marking slot ${booking.parking_slot_id} as occupied...`);
      await supabase.from('parking_slots').update({ status: 'occupied' }).eq('id', booking.parking_slot_id);
      
      // Also decrement lot capacity if not already done. (We'll sync lot capacity at the end)
    }
  }

  console.log('Syncing all parking lot capacities...');
  const { data: lots } = await supabase.from('parking_lots').select('id');
  if (lots) {
    for (const lot of lots) {
      const { data: slots } = await supabase.from('parking_slots').select('status').eq('parking_lot_id', lot.id).eq('status', 'available');
      const availableCount = slots ? slots.length : 0;
      await supabase.from('parking_lots').update({ available_capacity: availableCount }).eq('id', lot.id);
    }
  }
  console.log('Done!');
}

fixBookings();
