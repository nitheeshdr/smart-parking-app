import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './app-icon';
import { SLOT_TONE } from './ui/status';
import { COLORS, SIZES } from '../constants/theme';
import { formatMoney } from '../lib/format';
import type { ParkingSlot } from '../types/db';

interface Props {
  slots: ParkingSlot[];
  selectedId?: string | null;
  /** Slot ids that cannot be picked (e.g. already booked for the chosen time). */
  disabledIds?: Set<string>;
  onSelect?: (slot: ParkingSlot) => void;
  showPrice?: boolean;
}

export function SlotGrid({ slots, selectedId, disabledIds, onSelect, showPrice = true }: Props) {
  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const tone = SLOT_TONE[slot.status];
        const blocked = disabledIds?.has(slot.id) || slot.status === 'maintenance' || slot.status === 'disabled';
        const selected = selectedId === slot.id;
        return (
          <Pressable
            key={slot.id}
            disabled={!onSelect || blocked}
            onPress={() => onSelect?.(slot)}
            accessibilityRole="button"
            accessibilityLabel={`Slot ${slot.slot_number}, ${tone.label}`}
            style={[styles.tile, { backgroundColor: tone.bg, borderColor: selected ? COLORS.primary : tone.fg + '55' }, selected && styles.selected, blocked && onSelect ? { opacity: 0.45 } : null]}
          >
            <AppIcon name={slot.status === 'occupied' ? 'car-sport' : 'car-sport-outline'} size={22} color={tone.fg} />
            <Text style={[styles.num, { color: tone.fg }]}>{slot.slot_number}</Text>
            <Text style={[styles.status, { color: tone.fg }]}>{disabledIds?.has(slot.id) ? 'Booked' : tone.label}</Text>
            {showPrice ? <Text style={styles.price}>{formatMoney(slot.hourly_price)}/hr</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  tile: { width: '31%', flexGrow: 1, minWidth: 96, alignItems: 'center', paddingVertical: SIZES.md, borderRadius: SIZES.radiusMd, borderWidth: 1.5, gap: 2 },
  selected: { borderWidth: 2.5 },
  num: { fontSize: 15, fontWeight: '900', marginTop: 4 },
  status: { fontSize: 11, fontWeight: '700' },
  price: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
