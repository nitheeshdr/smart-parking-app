import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Card, Separator } from 'heroui-native';
import { ParkingLot } from '../features/parking/api/parkingApi';
import { AppIcon } from './app-icon';
import { COLORS, SIZES } from '../constants/theme';

interface ParkingCardProps {
  lot: ParkingLot;
  onPress: (id: string) => void;
}

export function ParkingCard({ lot, onPress }: ParkingCardProps) {
  const isFull = lot.available_capacity === 0;
  const isLow = !isFull && lot.available_capacity <= 5;
  const statusColor = isFull ? COLORS.error : isLow ? COLORS.warning : COLORS.success;
  const statusBg = isFull ? COLORS.errorLight : isLow ? COLORS.warningLight : COLORS.successLight;
  const statusLabel = isFull ? 'Full' : `${lot.available_capacity} slots`;

  return (
    <Pressable
      onPress={() => onPress(lot.id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`View ${lot.name}`}
    >
      <Card style={styles.card}>
        {/* Top accent line */}
        <View style={[styles.accent, { backgroundColor: statusColor }]} />

        <View style={styles.body}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{lot.name}</Text>
            <View style={[styles.badge, { backgroundColor: statusBg }]}>
              <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.badgeTxt, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.infoRow}>
            <AppIcon name="location-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.infoTxt} numberOfLines={1}>{lot.address}, {lot.city}</Text>
          </View>

          <Separator style={styles.sep} />

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.infoRow}>
              <AppIcon name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.infoTxt}>{lot.opening_time.slice(0, 5)} – {lot.closing_time.slice(0, 5)}</Text>
            </View>
            <Pressable
              style={[styles.bookBtn, isFull && styles.bookBtnDisabled]}
              onPress={() => !isFull && onPress(lot.id)}
              disabled={isFull}
              accessibilityRole="button"
              accessibilityLabel={isFull ? 'Lot full' : `Book ${lot.name}`}
            >
              <Text style={styles.bookBtnTxt}>{isFull ? 'Full' : 'Book'}</Text>
              {!isFull && <AppIcon name="arrow-forward" size={12} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SIZES.md, overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radiusMd,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    padding: 0,
  },
  accent: { height: 3 },
  body: { padding: SIZES.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.xs },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: SIZES.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  infoTxt: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  sep: { marginVertical: SIZES.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: SIZES.sm, paddingVertical: 7, borderRadius: 10,
  },
  bookBtnDisabled: { backgroundColor: COLORS.textDisabled },
  bookBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
