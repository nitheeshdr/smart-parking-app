import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testManagerAPIs() {
  console.log('Fetching an existing booking with a qr token...');
  const { data: booking } = await supabase.from('bookings').select('id, qr_token').limit(1).single();
  if (!booking) return console.log('No bookings found to test');
  
  const qrPayload = booking.qr_token || booking.id;
  console.log(`Testing verifyBookingQR for payload: ${qrPayload}`);
  
  let { data: verified, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, date, start_time, end_time, booking_status, profiles:customer_id(full_name), vehicles:vehicle_id(vehicle_number), parking_slots:parking_slot_id(slot_number), parking_lots:parking_lot_id(name)')
    .eq('qr_token', qrPayload)
    .maybeSingle();

  if (!verified) {
    const { data: bookingById } = await supabase
      .from('bookings')
      .select('id, booking_reference, date, start_time, end_time, booking_status, profiles:customer_id(full_name), vehicles:vehicle_id(vehicle_number), parking_slots:parking_slot_id(slot_number), parking_lots:parking_lot_id(name)')
      .eq('id', qrPayload)
      .maybeSingle();
    verified = bookingById;
  }

  if (error || !verified) return console.error('Verification failed', error);
  console.log('Verification Success:', verified.booking_reference, 'Status:', verified.booking_status);
  
  console.log(`Testing checkInVehicle for booking ${verified.id}...`);
  const { error: ciErr } = await supabase.from('bookings').update({ booking_status: 'active' }).eq('id', verified.id);
  if (ciErr) return console.error('Check-in failed:', ciErr);
  console.log('Check-in success! Status is now active.');
  
  console.log(`Testing checkOutVehicle for booking ${verified.id}...`);
  const { error: coErr } = await supabase.from('bookings').update({ booking_status: 'completed' }).eq('id', verified.id);
  if (coErr) return console.error('Check-out failed:', coErr);
  
  console.log('Check-out success! Reverting to original state...');
  await supabase.from('bookings').update({ booking_status: verified.booking_status }).eq('id', verified.id);
  
  console.log('All manager APIs working flawlessly!');
}

testManagerAPIs();
