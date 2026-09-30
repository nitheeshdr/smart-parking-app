import { supabase } from '../../../lib/supabase';

export interface DashboardStats {
  todayBookings: number;
  activeVehicles: number;
  availableSlots: number;
  occupiedSlots: number;
  revenue: number;
}

export const fetchManagerDashboardStats = async (managerId: string): Promise<DashboardStats> => {
  const { data: managerData } = await supabase
    .from('parking_managers')
    .select('id')
    .eq('user_id', managerId)
    .single();

  if (!managerData) return { todayBookings: 0, activeVehicles: 0, availableSlots: 0, occupiedSlots: 0, revenue: 0 };

  const { data: lots } = await supabase
    .from('parking_lots')
    .select('id, total_capacity, available_capacity')
    .eq('manager_id', managerData.id);
    
  if (!lots || lots.length === 0) {
    return {
      todayBookings: 0,
      activeVehicles: 0,
      availableSlots: 0,
      occupiedSlots: 0,
      revenue: 0
    };
  }
  
  const lotIds = lots.map(l => l.id);
  
  // Get today's bookings
  const today = new Date().toISOString().split('T')[0];
  const { data: bookings } = await supabase
    .from('bookings')
    .select('base_amount, booking_status')
    .in('parking_lot_id', lotIds)
    .eq('date', today);
    
  let revenue = 0;
  let activeVehicles = 0;
  let todayBookings = bookings?.length || 0;
  
  bookings?.forEach(b => {
    if (b.booking_status === 'confirmed' || b.booking_status === 'completed') {
      revenue += Number(b.base_amount);
    }
    if (b.booking_status === 'active') {
      activeVehicles++;
    }
  });
  
  let availableSlots = 0;
  let occupiedSlots = 0;
  
  lots.forEach(lot => {
    availableSlots += lot.available_capacity;
    occupiedSlots += (lot.total_capacity - lot.available_capacity);
  });

  return {
    todayBookings,
    activeVehicles,
    availableSlots,
    occupiedSlots,
    revenue
  };
};

export const verifyBookingQR = async (qrPayload: string) => {
  let { data: booking, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, date, start_time, end_time, booking_status, profiles:customer_id(full_name), vehicles:vehicle_id(vehicle_number), parking_slots:parking_slot_id(slot_number), parking_lots:parking_lot_id(name)')
    .eq('qr_token', qrPayload)
    .maybeSingle();

  if (!booking) {
    const { data: bookingById } = await supabase
      .from('bookings')
      .select('id, booking_reference, date, start_time, end_time, booking_status, profiles:customer_id(full_name), vehicles:vehicle_id(vehicle_number), parking_slots:parking_slot_id(slot_number), parking_lots:parking_lot_id(name)')
      .eq('id', qrPayload)
      .maybeSingle();
    booking = bookingById;
  }

  if (error || !booking) throw new Error('Invalid or expired ticket token.');
  
  return { valid: true, booking };
};

export const checkInVehicle = async (bookingId: string) => {
  const { error } = await supabase
    .from('bookings')
    .update({ booking_status: 'active' })
    .eq('id', bookingId);
  
  if (error) throw error;
  return { success: true };
};

export const checkOutVehicle = async (bookingId: string) => {
  const { error } = await supabase
    .from('bookings')
    .update({ booking_status: 'completed' })
    .eq('id', bookingId);
  
  if (error) throw error;
  
  const { data: booking } = await supabase.from('bookings').select('parking_slot_id, parking_lot_id').eq('id', bookingId).single();
  if (booking) {
    await supabase.from('parking_slots').update({ status: 'available' }).eq('id', booking.parking_slot_id);
    const { data: lot } = await supabase.from('parking_lots').select('available_capacity').eq('id', booking.parking_lot_id).single();
    if (lot) {
      await supabase.from('parking_lots').update({ available_capacity: lot.available_capacity + 1 }).eq('id', booking.parking_lot_id);
    }
  }
  return { success: true };
};

export const fetchManagerRecentBookings = async (managerUserId: string) => {
  const { data: manager, error: managerError } = await supabase
    .from('parking_managers')
    .select('id')
    .eq('user_id', managerUserId)
    .single();
  if (managerError) throw managerError;

  const { data: lots, error: lotsError } = await supabase
    .from('parking_lots')
    .select('id')
    .eq('manager_id', manager.id);
  if (lotsError) throw lotsError;
  if (!lots.length) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, booking_status, created_at, parking_lots(name), vehicles(vehicle_number)')
    .in('parking_lot_id', lots.map((lot) => lot.id))
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data;
};
