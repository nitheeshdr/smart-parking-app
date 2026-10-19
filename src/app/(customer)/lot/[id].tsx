import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchLot, fetchSlots } from '../../../api/lots';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';
import { Badge, Button, Card, ErrorState, LiveDot, Loading, Row, Screen, SectionTitle, StatCard, StatGrid } from '../../../components/ui';
import { SlotGrid } from '../../../components/slot-grid';
import { lotTone } from '../../../components/lot-card';
import { COLORS } from '../../../constants/theme';
import { formatMoney, hm } from '../../../lib/format';

export default function LotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useRealtimeSync(`customer_lot_${id}`, ['parking_slots', 'parking_lots'], [['lot', id], ['slots', id], ['lots']]);
  const lot = useQuery({ queryKey: ['lot', id], queryFn: () => fetchLot(id), enabled: !!id });
  const slots = useQuery({ queryKey: ['slots', id], queryFn: () => fetchSlots(id), enabled: !!id });

  if (lot.isLoading || slots.isLoading) return <Screen title="Parking lot" onBack={() => router.back()} scroll={false}><Loading /></Screen>;
  if (lot.error || !lot.data) return <Screen title="Parking lot" onBack={() => router.back()}><ErrorState error={lot.error ?? new Error('Lot not found.')} onRetry={lot.refetch} /></Screen>;

  const l = lot.data;
  const list = slots.data ?? [];
  const free = list.filter((s) => s.status === 'available').length;
  const busy = list.filter((s) => s.status === 'occupied').length;
  const prices = list.map((s) => Number(s.hourly_price));
  const from = prices.length ? Math.min(...prices) : 0;

  return (
    <Screen
      title={l.name}
      subtitle={`${l.address}, ${l.city}`}
      onBack={() => router.back()}
      right={<LiveDot />}
      refreshing={lot.isRefetching}
      onRefresh={() => { lot.refetch(); slots.refetch(); }}
    >
      <StatGrid>
        <StatCard label="Free now" value={free} icon="checkmark-circle-outline" color={COLORS.success} />
        <StatCard label="Occupied" value={busy} icon="car-outline" color={COLORS.error} />
      </StatGrid>

      <Card>
        <Row icon="pulse-outline" label="Status" value={<Badge tone={lotTone(l)} />} />
        <Row icon="time-outline" label="Open" value={`${hm(l.opening_time)} – ${hm(l.closing_time)}`} />
        <Row icon="cash-outline" label="Price" value={list.length ? `from ${formatMoney(from)}/hr` : '—'} />
        {l.description ? <Text style={styles.desc}>{l.description}</Text> : null}
      </Card>

      <SectionTitle>Live slot map</SectionTitle>
      {list.length === 0 ? <Text style={styles.desc}>This lot has no slots yet.</Text> : <SlotGrid slots={list} />}

      <View style={{ height: 16 }} />
      <Button label={free === 0 && list.length ? 'Book for later' : 'Book a slot'} icon="calendar-outline" disabled={list.length === 0} onPress={() => router.push(`/(customer)/book/${id}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 19 },
});
