import { COLORS } from '../../constants/theme';
import type { BookingStatus, SlotStatus } from '../../types/db';

export interface Tone {
  fg: string;
  bg: string;
  label: string;
}

export const SLOT_TONE: Record<SlotStatus, Tone> = {
  available: { fg: COLORS.success, bg: COLORS.successLight, label: 'Available' },
  occupied: { fg: COLORS.error, bg: COLORS.errorLight, label: 'Occupied' },
  reserved: { fg: COLORS.warning, bg: COLORS.warningLight, label: 'Reserved' },
  maintenance: { fg: COLORS.textMuted, bg: COLORS.surfaceHover, label: 'Maintenance' },
  disabled: { fg: COLORS.textMuted, bg: COLORS.surfaceHover, label: 'Disabled' },
};

export const BOOKING_TONE: Record<BookingStatus, Tone> = {
  pending: { fg: COLORS.warning, bg: COLORS.warningLight, label: 'Pending' },
  confirmed: { fg: COLORS.info, bg: COLORS.infoLight, label: 'Confirmed' },
  active: { fg: COLORS.success, bg: COLORS.successLight, label: 'Parked' },
  completed: { fg: COLORS.textMuted, bg: COLORS.surfaceHover, label: 'Completed' },
  cancelled: { fg: COLORS.error, bg: COLORS.errorLight, label: 'Cancelled' },
  expired: { fg: COLORS.textMuted, bg: COLORS.surfaceHover, label: 'Expired' },
  no_show: { fg: COLORS.error, bg: COLORS.errorLight, label: 'No show' },
};
