import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './app-icon';
import { Badge, Card } from './ui';
import { COLORS, SIZES } from '../constants/theme';
import { hm } from '../lib/format';
import type { ParkingLot } from '../types/db';

export function lotTone(lot: Pick<ParkingLot, 'available_capacity' | 'total_capacity'>) {
  if (lot.total_capacity === 0) return { fg: COLORS.textMuted, bg: COLORS.surfaceHover, label: 'No slots' };
  if (lot.available_capacity === 0) return { fg: COLORS.error, bg: COLORS.errorLight, label: 'Full' };
  if (lot.available_capacity <= Math.ceil(lot.total_capacity * 0.25)) return { fg: COLORS.warning, bg: COLORS.warningLight, label: `${lot.available_capacity} free` };
  return { fg: COLORS.success, bg: COLORS.successLight, label: `${lot.available_capacity} free` };
}

export function LotCard({ lot, onPress, footer }: { lot: ParkingLot; onPress?: () => void; footer?: React.ReactNode }) {
  return (
    <Card onPress={onPress}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>{lot.name}</Text>
        <Badge tone={lotTone(lot)} />
      </View>
      <View style={styles.line}>
        <AppIcon name="location-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.meta} numberOfLines={1}>{lot.address}, {lot.city}</Text>
      </View>
      <View style={styles.line}>
        <AppIcon name="time-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.meta}>{hm(lot.opening_time)} – {hm(lot.closing_time)}</Text>
        <Text style={[styles.meta, { marginLeft: 'auto' }]}>{lot.available_capacity}/{lot.total_capacity} slots free</Text>
      </View>
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZES.sm, marginBottom: 6 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, flexShrink: 1 },
});
