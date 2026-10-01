import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fixSlotStatus() {
  const email = 'admin@smartparking.com';
  const password = 'password123';
  
  await supabase.auth.signInWithPassword({ email, password });
  
  // Find all active/completed bookings
  const { data: bookings } = await supabase.from('bookings').select('id, parking_slot_id, booking_status');
  for (const b of bookings || []) {
    if (b.booking_status === 'completed' || b.booking_status === 'active') {
      await supabase.from('parking_slots').update({ status: 'occupied' }).eq('id', b.parking_slot_id);
    }
  }
  
  // Recalculate capacity
  const { data: lots } = await supabase.from('parking_lots').select('id');
  if (lots) {
    for (const lot of lots) {
      const { data: slots } = await supabase.from('parking_slots').select('status').eq('parking_lot_id', lot.id);
      const totalCount = slots ? slots.length : 0;
      const availableCount = slots ? slots.filter(s => s.status === 'available').length : 0;
      
      await supabase.from('parking_lots').update({ 
        total_capacity: totalCount, 
        available_capacity: availableCount 
      }).eq('id', lot.id);
      console.log(`Lot fixed! Total: ${totalCount}, Available: ${availableCount}`);
    }
  }
}

fixSlotStatus();
