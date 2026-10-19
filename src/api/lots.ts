import { supabase } from '../lib/supabase';
import { rpc, unwrap } from './rpc';
import type { LotStatus, ParkingLot, ParkingSlot, SlotStatus } from '../types/db';

export const fetchActiveLots = async (): Promise<ParkingLot[]> =>
  unwrap(await supabase.from('parking_lots').select('*').eq('status', 'active').order('name'));

export const fetchLot = async (id: string): Promise<ParkingLot> =>
  unwrap(await supabase.from('parking_lots').select('*').eq('id', id).single());

export const fetchSlots = async (lotId: string): Promise<ParkingSlot[]> =>
  unwrap(await supabase.from('parking_slots').select('*').eq('parking_lot_id', lotId).order('slot_number'));

export const fetchBusyWindows = async (slotId: string, date: string) =>
  unwrap<{ start_time: string; end_time: string }[]>(
    await supabase.rpc('slot_busy_windows', { p_slot_id: slotId, p_date: date }),
  );

/** Every lot (admin view). */
export const fetchAllLots = async (): Promise<ParkingLot[]> =>
  unwrap(await supabase.from('parking_lots').select('*').order('created_at'));

export interface LotInput {
  name: string;
  description?: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  opening_time: string;
  closing_time: string;
  status: LotStatus;
  visibility_range_km: number;
}

export async function updateLot(id: string, patch: Partial<LotInput>): Promise<void> {
  unwrap(await supabase.from('parking_lots').update(patch).eq('id', id).select('id').single());
}

export async function setSlotStatus(slotId: string, status: SlotStatus): Promise<void> {
  unwrap(await supabase.from('parking_slots').update({ status }).eq('id', slotId).select('id').single());
}

export async function updateSlotPrice(slotId: string, hourly_price: number): Promise<void> {
  unwrap(await supabase.from('parking_slots').update({ hourly_price }).eq('id', slotId).select('id').single());
}

/** Manually mark a slot occupied/free (same RPC the ESP8266 uses). */
export const setSlotOccupancy = (slotId: string, occupied: boolean) =>
  rpc('set_slot_occupancy', { p_slot_id: slotId, p_occupied: occupied });


export const fetchSlotsForLots = async (lotIds: string[]): Promise<ParkingSlot[]> =>
  lotIds.length ? unwrap(await supabase.from('parking_slots').select('*').in('parking_lot_id', lotIds).order('slot_number')) : [];
