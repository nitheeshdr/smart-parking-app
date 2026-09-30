import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testBookingFlow() {
  // 1. Auth as a customer (we'll just pretend by fetching any customer)
  const { data: users } = await supabase.from('parking_managers').select('user_id').limit(1); // Wait, we don't have customer table, we use auth.users but can't query it.
  
  // We'll just create a dummy customer UUID
  const customerId = '00000000-0000-0000-0000-000000000001';

  // 2. Fetch active lot
  const { data: lots } = await supabase.from('parking_lots').select('*').limit(1);
  const lot = lots[0];
  console.log('Lot:', lot.name);

  // 3. Fetch available slot
  const { data: slots } = await supabase.from('parking_slots').select('*').eq('parking_lot_id', lot.id).eq('status', 'available').limit(1);
  const slot = slots[0];
  console.log('Slot:', slot.slot_number);

  // 4. Create vehicle
  const { data: vehicle, error: vErr } = await supabase.from('vehicles').insert({
    user_id: customerId,
    vehicle_number: 'TEST01',
    vehicle_type: 'car'
  }).select().single();
  
  let vId = vehicle ? vehicle.id : null;
  if (vErr) {
     const { data: existingV } = await supabase.from('vehicles').select('*').eq('vehicle_number', 'TEST01').single();
     vId = existingV.id;
  }
  
  console.log('Vehicle ID:', vId);

  // 5. Call RPC
  const { data: intent, error: rpcErr } = await supabase.rpc('create_booking_intent', {
    p_customer_id: customerId,
    p_parking_lot_id: lot.id,
    p_parking_slot_id: slot.id,
    p_vehicle_id: vId,
    p_date: '2027-10-01',
    p_start_time: '10:00:00',
    p_end_time: '11:00:00',
    p_base_amount: 50,
  });

  console.log('RPC Intent Result:', intent || rpcErr);
}

testBookingFlow();
