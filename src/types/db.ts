export type UserRole = 'customer' | 'admin';
export type SlotStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'disabled';
export type SlotType = 'regular' | 'disabled' | 'ev' | 'premium' | 'reserved';
export type VehicleType = 'bike' | 'car' | 'suv' | 'ev';
export type LotStatus = 'active' | 'inactive' | 'maintenance';
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  created_at: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  pincode: string;
  opening_time: string;
  closing_time: string;
  status: LotStatus;
  total_capacity: number;
  available_capacity: number;
  visibility_range_km: number;
  created_at: string;
}

export interface ParkingSlot {
  id: string;
  parking_lot_id: string;
  slot_number: string;
  slot_type: SlotType;
  vehicle_type: VehicleType;
  floor: string;
  status: SlotStatus;
  hourly_price: number;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  vehicle_model: string | null;
  vehicle_color: string | null;
}

export interface Booking {
  id: string;
  booking_reference: string;
  customer_id: string;
  parking_lot_id: string;
  parking_slot_id: string;
  vehicle_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  qr_token: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  parking_lots?: { name: string; address?: string; city?: string } | null;
  parking_slots?: { slot_number: string } | null;
  vehicles?: { vehicle_number: string } | null;
  profiles?: { full_name: string; email?: string } | null;
}

export interface GateSystem {
  id: number;
  car_count: number;
  gate_status: string;
  updated_at: string;
}

export interface TicketInfo {
  id: string;
  booking_reference: string;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  date: string;
  start_time: string;
  end_time: string;
  parking_lot_id: string;
  lot_name: string;
  slot_number: string;
  vehicle_number: string;
  customer_name: string;
}
