import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllLots, fetchSlots, setSlotOccupancy, setSlotStatus, updateSlotPrice } from '../../api/lots';
import { Badge, Button, Card, EmptyState, ErrorState, Field, LiveDot, Loading, Row, Screen, SectionTitle } from '../../components/ui';
import { SLOT_TONE } from '../../components/ui/status';
import { SlotGrid } from '../../components/slot-grid';
import { COLORS, SIZES } from '../../constants/theme';
import { errorMessage, formatMoney, hm } from '../../lib/format';
import type { ParkingSlot } from '../../types/db';

/** The lot (slots come from the hardware): live slot map, manual overrides, pricing and maintenance. */
export default function LotScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [price, setPrice] = useState('');

  const lots = useQuery({ queryKey: ['all_lots'], queryFn: fetchAllLots });
  const lot = lots.data?.[0];
  const slots = useQuery({ queryKey: ['lot_slots', lot?.id], queryFn: () => fetchSlots(lot!.id), enabled: !!lot });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['lot_slots'] });
    queryClient.invalidateQueries({ queryKey: ['all_lots'] });
    queryClient.invalidateQueries({ queryKey: ['staff_slots'] });
  };
  const fail = (title: string) => (e: unknown) => Alert.alert(title, errorMessage(e));
  const setStatus = useMutation({ mutationFn: (v: { slot: ParkingSlot; status: ParkingSlot['status'] }) => setSlotStatus(v.slot.id, v.status), onSuccess: refresh, onError: fail('Could not update slot') });
  const override = useMutation({ mutationFn: (v: { slot: ParkingSlot; occupied: boolean }) => setSlotOccupancy(v.slot.id, v.occupied), onSuccess: refresh, onError: fail('Could not update slot') });
  const setRate = useMutation({
    mutationFn: (v: { slot: ParkingSlot; rate: number }) => updateSlotPrice(v.slot.id, v.rate),
    onSuccess: () => { refresh(); Alert.alert('Price updated'); },
    onError: fail('Could not update price'),
  });

  if (lots.isLoading) return <Screen title="Lot" scroll={false}><Loading /></Screen>;
  if (lots.error) return <Screen title="Lot"><ErrorState error={lots.error} onRetry={lots.refetch} /></Screen>;
  if (!lot) return <Screen title="Lot"><EmptyState icon="business-outline" title="No lot found" hint="Run the database setup script to create the lot." /></Screen>;

  const list = slots.data ?? [];
  const slot = list.find((s) => s.id === selected);

  return (
    <Screen title={lot.name} subtitle={`${lot.available_capacity} of ${lot.total_capacity} free · tap a slot to manage`} right={<LiveDot />} refreshing={slots.isRefetching} onRefresh={() => { lots.refetch(); slots.refetch(); }}>
      <Card>
        <Row icon="location-outline" label="Address" value={`${lot.address}, ${lot.city}`} />
        <Row icon="time-outline" label="Open" value={`${hm(lot.opening_time)} – ${hm(lot.closing_time)}`} />
        <Row icon="eye-outline" label="Visibility" value={lot.status === 'active' ? 'Shown to customers' : lot.status === 'inactive' ? 'Hidden' : 'Maintenance'} />
        <Button label="Edit lot details" icon="create-outline" variant="secondary" small onPress={() => router.push('/(admin)/lot-edit')} style={{ marginTop: SIZES.sm }} />
      </Card>

      <SectionTitle>Slots (from the sensors)</SectionTitle>
      {list.length ? <SlotGrid slots={list} selectedId={selected} onSelect={(s) => { setSelected(s.id); setPrice(String(s.hourly_price)); }} /> : <Text style={styles.empty}>No slots registered yet.</Text>}

      {slot ? (
        <Card style={{ marginTop: SIZES.md }}>
          <View style={styles.head}>
            <Text style={styles.title}>Slot {slot.slot_number}</Text>
            <Badge tone={SLOT_TONE[slot.status]} />
          </View>
          <Text style={styles.hint}>Occupied / free follows the IR sensor automatically. Override only if a sensor misbehaves.</Text>
          <View style={styles.actions}>
            {slot.status === 'maintenance' || slot.status === 'disabled' ? (
              <Button label="Put back in service" icon="checkmark-circle-outline" small onPress={() => setStatus.mutate({ slot, status: 'available' })} loading={setStatus.isPending} />
            ) : (
              <>
                <Button label={slot.status === 'occupied' ? 'Mark free' : 'Mark occupied'} small variant="secondary" icon="swap-horizontal-outline" onPress={() => override.mutate({ slot, occupied: slot.status !== 'occupied' })} loading={override.isPending} />
                <Button label="Maintenance" small variant="ghost" icon="construct-outline" onPress={() => setStatus.mutate({ slot, status: 'maintenance' })} loading={setStatus.isPending} />
              </>
            )}
          </View>
          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}><Field label={`Price per hour (now ${formatMoney(slot.hourly_price)})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" /></View>
            <Button label="Save" small variant="secondary" disabled={price === '' || !(Number(price) >= 0)} loading={setRate.isPending} onPress={() => setRate.mutate({ slot, rate: Number(price) })} style={{ marginBottom: SIZES.md }} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginVertical: SIZES.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: SIZES.md },
  actions: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.md, flexWrap: 'wrap' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm },
});
