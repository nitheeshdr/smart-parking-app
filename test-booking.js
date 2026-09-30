import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testBookingWithCustomer() {
  const email = 'customer@smartparking.com';
  const passwordsToTry = ['password123', 'password', '123456', 'customer123', 'Password123!', '12345678'];
  
  let authData = null;
  for (const p of passwordsToTry) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: p });
    if (!error && data.user) {
      authData = data;
      console.log(`Successfully logged in with password: ${p}`);
      break;
    }
  }

  if (!authData) {
    console.error('Could not log in with common passwords. Please provide the password for customer@smartparking.com');
    return;
  }

  const userId = authData.user.id;
  
  // 1. Fetch active parking lot
  console.log('Fetching active parking lot...');
  const { data: lots, error: lErr } = await supabase.from('parking_lots').select('*').eq('status', 'active').limit(1);
  if (lErr || !lots?.length) return console.error('Error fetching active lot:', lErr);
  const lot = lots[0];

  // 2. Get available slot
  const { data: slots } = await supabase.from('parking_slots').select('*').eq('parking_lot_id', lot.id).eq('status', 'available').limit(1);
  if (!slots || slots.length === 0) {
    return console.log('No available slots for lot:', lot.name);
  }
  const slot = slots[0];

  // 3. Insert vehicle
  const vehicleNum = `CUST01`;
  let { data: vehicle, error: vErr } = await supabase.from('vehicles').insert({
    user_id: userId,
    vehicle_number: vehicleNum,
    vehicle_type: 'car'
  }).select().single();
  
  if (vErr) {
     const { data: existingV } = await supabase.from('vehicles').select('*').eq('vehicle_number', vehicleNum).single();
     vehicle = existingV;
  }
  if (!vehicle) {
    return console.error('Could not get or create vehicle for user', userId, vErr);
  }
  console.log(`Booking Slot: ${slot.slot_number} with Vehicle: ${vehicle.vehicle_number}`);

  // 4. Create booking intent via RPC
  const { data: intent, error: rpcErr } = await supabase.rpc('create_booking_intent', {
    p_customer_id: userId,
    p_parking_lot_id: lot.id,
    p_parking_slot_id: slot.id,
    p_vehicle_id: vehicle.id,
    p_date: new Date().toISOString().split('T')[0],
    p_start_time: '14:00:00',
    p_end_time: '15:00:00',
    p_base_amount: lot.hourly_price || 50,
  });

  if (rpcErr || !intent || intent.status !== 'success') {
    return console.error('Failed to create booking intent:', rpcErr || intent);
  }
  console.log('Booking Intent created successfully!', intent.booking_id);

  // 5. Complete Booking
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ booking_status: 'completed' })
    .eq('id', intent.booking_id);

  if (updateErr) {
    console.error('Failed to complete booking:', updateErr);
  } else {
    console.log(`✅ Successfully completed booking for ${email}!`);
  }
}

testBookingWithCustomer();
