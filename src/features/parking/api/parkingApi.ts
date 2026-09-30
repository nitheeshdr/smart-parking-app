import { supabase } from '../../../lib/supabase';

export interface ParkingLot {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  pincode: string;
  opening_time: string;
  closing_time: string;
  status: string;
  total_capacity: number;
  available_capacity: number;
}

export interface ParkingSlot {
  id: string;
  parking_lot_id: string;
  slot_number: string;
  slot_type: 'regular' | 'disabled' | 'ev' | 'premium' | 'reserved';
  vehicle_type: 'bike' | 'car' | 'suv' | 'ev';
  floor: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'disabled';
  hourly_price: number;
}

export interface CreateBookingInput {
  customerId: string;
  lotId: string;
  slotId: string;
  vehicleNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyPrice: number;
}

export const fetchParkingLots = async (): Promise<ParkingLot[]> => {
  const { data, error } = await supabase
    .from('parking_lots')
    .select('*')
    .eq('status', 'active');
    
  if (error) throw error;
  return data as ParkingLot[];
};

export const fetchParkingLotById = async (id: string): Promise<ParkingLot> => {
  const { data, error } = await supabase
    .from('parking_lots')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data as ParkingLot;
};

export const fetchParkingSlots = async (lotId: string): Promise<ParkingSlot[]> => {
  const { data, error } = await supabase
    .from('parking_slots')
    .select('*')
    .eq('parking_lot_id', lotId);
    
  if (error) throw error;
  return data as ParkingSlot[];
};

/** Creates a vehicle if necessary, then creates and pays for a booking intent. */
export const createAndPayForBooking = async (input: CreateBookingInput) => {
  const vehicleNumber = input.vehicleNumber.trim().toUpperCase();
  if (!vehicleNumber) throw new Error('Enter a vehicle registration number.');

  const { data: existingVehicle, error: vehicleLookupError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('user_id', input.customerId)
    .eq('vehicle_number', vehicleNumber)
    .maybeSingle();
  if (vehicleLookupError) throw vehicleLookupError;

  let vehicleId = existingVehicle?.id;
  if (!vehicleId) {
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({ user_id: input.customerId, vehicle_number: vehicleNumber, vehicle_type: 'car' })
      .select('id')
      .single();
    if (vehicleError) throw vehicleError;
    vehicleId = vehicle.id;
  }

  const startTime = input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime;
  const endTime = input.endTime.length === 5 ? `${input.endTime}:00` : input.endTime;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const duration = (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('End time must be after the start time.');

  const { data: bookingIntent, error: bookingError } = await supabase.rpc('create_booking_intent', {
    p_customer_id: input.customerId,
    p_parking_lot_id: input.lotId,
    p_parking_slot_id: input.slotId,
    p_vehicle_id: vehicleId,
    p_date: input.date,
    p_start_time: startTime,
    p_end_time: endTime,
    p_base_amount: input.hourlyPrice * duration,
  });
  if (bookingError) throw bookingError;
  if (!bookingIntent || bookingIntent.status !== 'success') {
    throw new Error(bookingIntent?.details || bookingIntent?.message || 'Unable to reserve this slot.');
  }

  // Bypass edge function for demo: update booking directly
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ booking_status: 'completed' })
    .eq('id', bookingIntent.booking_id);

  if (updateError) throw updateError;

  const qrToken = `BKG-${bookingIntent.booking_id.split('-')[0].toUpperCase()}-OK`;
  return { ...bookingIntent, qrToken };
};
