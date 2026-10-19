import { supabase } from '../lib/supabase';
import { rpc, unwrap } from './rpc';
import type { Booking, GateSystem, TicketInfo, Vehicle, VehicleType } from '../types/db';

const BOOKING_SELECT =
  '*, parking_lots(name, address, city), parking_slots(slot_number), vehicles(vehicle_number), profiles:customer_id(full_name, email)';

export interface BookSlotInput {
  lotId: string;
  slotId: string;
  vehicleId: string;
  date: string;
  start: string; // HH:MM
  end: string; // HH:MM
}

export const bookSlot = (i: BookSlotInput) =>
  rpc<{ booking_id: string; booking_reference: string; qr_token: string; amount: number }>('book_slot', {
    p_lot_id: i.lotId,
    p_slot_id: i.slotId,
    p_vehicle_id: i.vehicleId,
    p_date: i.date,
    p_start: i.start.length === 5 ? `${i.start}:00` : i.start,
    p_end: i.end.length === 5 ? `${i.end}:00` : i.end,
  });

export const cancelBooking = (id: string) => rpc('cancel_booking', { p_booking_id: id });
export const checkInBooking = (id: string) => rpc('check_in_booking', { p_booking_id: id });
export const checkOutBooking = (id: string) => rpc('check_out_booking', { p_booking_id: id });
export const verifyTicket = async (token: string) => (await rpc<{ booking: TicketInfo }>('verify_ticket', { p_token: token })).booking;

export const fetchMyBookings = async (userId: string): Promise<Booking[]> =>
  unwrap(await supabase.from('bookings').select(BOOKING_SELECT).eq('customer_id', userId).order('created_at', { ascending: false }));

export const fetchBooking = async (id: string): Promise<Booking> =>
  unwrap(await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).single());

/** Bookings the signed-in staff member can see (RLS: a manager's own lots, or everything for an admin). */
export async function fetchStaffBookings(opts: { limit?: number; lotId?: string; date?: string } = {}): Promise<Booking[]> {
  let q = supabase.from('bookings').select(BOOKING_SELECT).order('created_at', { ascending: false });
  if (opts.lotId) q = q.eq('parking_lot_id', opts.lotId);
  if (opts.date) q = q.eq('date', opts.date);
  if (opts.limit) q = q.limit(opts.limit);
  return unwrap(await q);
}

export const fetchVehicles = async (userId: string): Promise<Vehicle[]> =>
  unwrap(await supabase.from('vehicles').select('*').eq('user_id', userId).order('created_at'));

export async function addVehicle(userId: string, number: string, type: VehicleType, model?: string, color?: string): Promise<Vehicle> {
  const vehicle_number = number.trim().toUpperCase().replace(/\s+/g, '');
  if (vehicle_number.length < 4) throw new Error('Enter a valid registration number.');
  return unwrap(
    await supabase
      .from('vehicles')
      .insert({ user_id: userId, vehicle_number, vehicle_type: type, vehicle_model: model || null, vehicle_color: color || null })
      .select('*')
      .single(),
  );
}

export async function deleteVehicle(id: string): Promise<void> {
  unwrap(await supabase.from('vehicles').delete().eq('id', id).select('id').single());
}

export const fetchGateSystem = async (): Promise<GateSystem | null> =>
  unwrap(await supabase.from('parking_system').select('*').eq('id', 1).maybeSingle());
