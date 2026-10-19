import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Card } from './ui';
import { BOOKING_TONE } from './ui/status';
import { AppIcon } from './app-icon';
import { COLORS, SIZES } from '../constants/theme';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import type { Booking } from '../types/db';

export function BookingCard({ booking, onPress, showCustomer, footer }: { booking: Booking; onPress?: () => void; showCustomer?: boolean; footer?: React.ReactNode }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>{booking.parking_lots?.name ?? 'Parking lot'}</Text>
        <Badge tone={BOOKING_TONE[booking.booking_status]} />
      </View>
      <View style={styles.line}>
        <AppIcon name="calendar-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.meta}>{formatDate(booking.date)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}</Text>
      </View>
      <View style={styles.line}>
        <AppIcon name="car-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.meta}>
          Slot {booking.parking_slots?.slot_number ?? '—'} · {booking.vehicles?.vehicle_number ?? '—'}
          {showCustomer && booking.profiles?.full_name ? ` · ${booking.profiles.full_name}` : ''}
        </Text>
        <Text style={[styles.meta, styles.amount]}>{formatMoney(booking.total_amount)}</Text>
      </View>
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZES.sm, marginBottom: 6 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, flexShrink: 1 },
  amount: { marginLeft: 'auto', fontWeight: '800', color: COLORS.text, fontSize: 13 },
});
