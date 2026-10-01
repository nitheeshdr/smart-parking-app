import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function fixLotCapacity() {
  const email = 'manager@smartparking.com';
  const password = 'password123';
  
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    // maybe try admin
    const { data: adminAuth, error: adminErr } = await supabase.auth.signInWithPassword({ email: 'admin@smartparking.com', password: 'password123' });
    if (adminErr) return console.error('Auth error:', adminErr);
  }
  
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
      
      console.log(`Updated lot ${lot.id} - Total: ${totalCount}, Available: ${availableCount}`);
    }
  }
}

fixLotCapacity();
