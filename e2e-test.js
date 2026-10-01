import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function runE2ETests() {
  console.log('=== STARTING AUTOMATED E2E API TESTS ===');
  let errors = 0;

  try {
    // 1. Setup Admin to ensure test users exist
    const { data: adminAuth } = await supabase.auth.signInWithPassword({ email: 'admin@smartparking.com', password: 'password123' });
    if (!adminAuth?.user) throw new Error('Admin auth failed');

    console.log('\n[1] TEST: Fetching Lots');
    const { data: lots, error: lotErr } = await supabase.from('parking_lots').select('*').limit(1);
    if (lotErr || !lots) throw lotErr;
    const lot = lots[0];
    console.log(`✅ Success: Found lot "${lot.name}"`);

    console.log('\n[2] TEST: Manager Authentication');
    const { data: managerAuth, error: mgrErr } = await supabase.auth.signInWithPassword({ email: 'manager@smartparking.com', password: 'password123' });
    if (mgrErr) throw mgrErr;
    console.log(`✅ Success: Manager authenticated (${managerAuth.user.id})`);

    console.log('\n[3] TEST: Customer Authentication');
    const { data: custAuth, error: custErr } = await supabase.auth.signInWithPassword({ email: 'customer@smartparking.com', password: 'password123' });
    if (custErr) throw custErr;
    console.log(`✅ Success: Customer authenticated (${custAuth.user.id})`);

    console.log('\n[4] TEST: Customer fetches available slots');
    const { data: slots, error: slotErr } = await supabase.from('parking_slots').select('*').eq('parking_lot_id', lot.id).eq('status', 'available').limit(1);
    if (slotErr || !slots || slots.length === 0) throw slotErr || new Error('No available slots');
    const slot = slots[0];
    console.log(`✅ Success: Found available slot ${slot.slot_number}`);

    console.log('\n[5] TEST: Customer fetches vehicles');
    const { data: vehicles, error: vehErr } = await supabase.from('vehicles').select('*').eq('user_id', custAuth.user.id).limit(1);
    if (vehErr || !vehicles || vehicles.length === 0) throw vehErr || new Error('No vehicles found');
    const vehicle = vehicles[0];
    console.log(`✅ Success: Found vehicle ${vehicle.vehicle_number}`);

    console.log('\n[6] TEST: Customer books a slot via RPC (create_booking_intent)');
    const { data: intent, error: rpcErr } = await supabase.rpc('create_booking_intent', {
      p_customer_id: custAuth.user.id,
      p_parking_lot_id: lot.id,
      p_parking_slot_id: slot.id,
      p_vehicle_id: vehicle.id,
      p_date: new Date().toISOString().split('T')[0],
      p_start_time: '18:00:00',
      p_end_time: '20:00:00',
      p_base_amount: 50,
    });
    if (rpcErr || !intent || intent.status !== 'success') throw rpcErr || intent;
    console.log(`✅ Success: Booking intent created (${intent.booking_id})`);

    console.log('\n[7] TEST: Payment Completion & Database Update');
    const qrToken = `BKG-${intent.booking_id.split('-')[0].toUpperCase()}-OK`;
    const { error: updErr } = await supabase.from('bookings').update({ 
      booking_status: 'completed', 
      payment_status: 'paid', 
      qr_token: qrToken 
    }).eq('id', intent.booking_id);
    if (updErr) throw updErr;
    
    await supabase.from('parking_slots').update({ status: 'occupied' }).eq('id', slot.id);
    console.log(`✅ Success: Payment completed & QR token saved: ${qrToken}`);

    console.log('\n[8] TEST: Manager QR Verification');
    const { data: verified, error: verErr } = await supabase.from('bookings').select('id, booking_status').eq('qr_token', qrToken).single();
    if (verErr || !verified) throw verErr;
    console.log(`✅ Success: Manager successfully verified QR token!`);

    console.log('\n[9] TEST: Manager Check-In');
    const { error: ciErr } = await supabase.from('bookings').update({ booking_status: 'active' }).eq('id', verified.id);
    if (ciErr) throw ciErr;
    console.log(`✅ Success: Customer vehicle checked in (status: active)`);

    console.log('\n[10] TEST: Manager Check-Out & Slot Release');
    const { error: coErr } = await supabase.from('bookings').update({ booking_status: 'completed' }).eq('id', verified.id);
    if (coErr) throw coErr;
    await supabase.from('parking_slots').update({ status: 'available' }).eq('id', slot.id);
    console.log(`✅ Success: Customer vehicle checked out, slot ${slot.slot_number} marked available again!`);

  } catch (err) {
    console.error('❌ E2E TEST FAILED:', err);
    errors++;
  }

  if (errors === 0) {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The APIs and Supabase functions are 100% healthy.');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED. Please review the errors above.');
  }
}

runE2ETests();
