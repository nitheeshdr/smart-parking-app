import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBusyWindows, fetchLot, fetchSlots } from '../../../api/lots';
import { addVehicle, bookSlot, fetchVehicles } from '../../../api/bookings';
import { useAuthStore } from '../../../stores/authStore';
import { AppIcon } from '../../../components/app-icon';
import { Button, Card, EmptyState, Field, Loading, Screen, SectionTitle } from '../../../components/ui';
import { SlotGrid } from '../../../components/slot-grid';
import { COLORS, SIZES } from '../../../constants/theme';
import { addDays, errorMessage, formatDate, formatMoney, formatTime, hm, isoDate, isValidTime, minutesOf, nextHalfHour, timeFromMinutes } from '../../../lib/format';

const DURATIONS = [1, 2, 3, 4, 6, 8];

export default function BookSlotScreen() {
  const { lot_id: lotId } = useLocalSearchParams<{ lot_id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const today = isoDate();
  const [date, setDate] = useState(today);
  const [start, setStart] = useState(nextHalfHour());
  const [hours, setHours] = useState(1);
  const [pickedSlotId, setSlotId] = useState<string | null>(null);
  const [pickedVehicleId, setVehicleId] = useState<string | null>(null);
  const [newPlate, setNewPlate] = useState('');

  const lot = useQuery({ queryKey: ['lot', lotId], queryFn: () => fetchLot(lotId), enabled: !!lotId });
  const slots = useQuery({ queryKey: ['slots', lotId], queryFn: () => fetchSlots(lotId), enabled: !!lotId });
  const vehicles = useQuery({ queryKey: ['vehicles', userId], queryFn: () => fetchVehicles(userId), enabled: !!userId });

  // Default to the first vehicle.
  const vehicleId = pickedVehicleId ?? vehicles.data?.[0]?.id ?? null;

  const validStart = isValidTime(start);
  const endMinutes = validStart ? minutesOf(start) + hours * 60 : 0;
  const end = timeFromMinutes(endMinutes);
  const closing = lot.data ? minutesOf(hm(lot.data.closing_time)) : 24 * 60;
  const opening = lot.data ? minutesOf(hm(lot.data.opening_time)) : 0;
  const timeError = !validStart
    ? 'Enter the start time as HH:MM (24-hour).'
    : endMinutes > 24 * 60 - 1 || endMinutes > closing + 1
      ? `This lot closes at ${hm(lot.data?.closing_time)}. Choose a shorter stay.`
      : minutesOf(start) < opening
        ? `This lot opens at ${hm(lot.data?.opening_time)}.`
        : date === today && endMinutes <= minutesOf(timeFromMinutes(new Date().getHours() * 60 + new Date().getMinutes()))
          ? 'That time has already passed.'
          : '';

  // Which slots are already booked during the chosen window?
  const busy = useQuery({
    queryKey: ['busy', lotId, date, slots.data?.map((s) => s.id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all((slots.data ?? []).map(async (s) => [s.id, await fetchBusyWindows(s.id, date)] as const));
      return Object.fromEntries(entries);
    },
    enabled: !!slots.data?.length,
  });

  const bookedIds = useMemo(() => {
    const set = new Set<string>();
    if (!validStart) return set;
    const s = minutesOf(start);
    for (const [id, windows] of Object.entries(busy.data ?? {})) {
      if (windows.some((w) => minutesOf(hm(w.start_time)) < endMinutes && minutesOf(hm(w.end_time)) > s)) set.add(id);
    }
    return set;
  }, [busy.data, start, endMinutes, validStart]);

  // Ignore the selection if it just became unavailable (e.g. someone else booked it).
  const slotId = pickedSlotId && !bookedIds.has(pickedSlotId) ? pickedSlotId : null;

  const slot = slots.data?.find((s) => s.id === slotId);
  const amount = slot ? Number(slot.hourly_price) * hours : 0;

  const addPlate = useMutation({
    mutationFn: () => addVehicle(userId, newPlate, 'car'),
    onSuccess: (v) => {
      setNewPlate('');
      setVehicleId(v.id);
      queryClient.invalidateQueries({ queryKey: ['vehicles', userId] });
    },
    onError: (e) => Alert.alert('Could not add vehicle', errorMessage(e)),
  });

  const confirm = useMutation({
    mutationFn: () => bookSlot({ lotId, slotId: slotId!, vehicleId: vehicleId!, date, start, end }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['busy', lotId] });
      router.replace(`/(customer)/booking/${res.booking_id}`);
    },
    onError: (e) => {
      Alert.alert('Booking failed', errorMessage(e));
      queryClient.invalidateQueries({ queryKey: ['busy', lotId] });
    },
  });

  if (lot.isLoading || slots.isLoading) return <Screen title="Book a slot" onBack={() => router.back()} scroll={false}><Loading /></Screen>;
  if (!lot.data) return <Screen title="Book a slot" onBack={() => router.back()}><EmptyState icon="alert-circle-outline" title="Lot not found" /></Screen>;

  const canConfirm = !!slot && !!vehicleId && !timeError;

  return (
    <Screen title="Book a slot" subtitle={lot.data.name} onBack={() => router.back()}>
      <SectionTitle>1 · When</SectionTitle>
      <View style={styles.chips}>
        {[0, 1, 2, 3].map((n) => {
          const d = addDays(today, n);
          const active = d === date;
          return (
            <Pressable key={d} onPress={() => setDate(d)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button">
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : formatDate(d)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field label="Start time (24h)" icon="time-outline" value={start} onChangeText={setStart} placeholder="HH:MM" keyboardType="numbers-and-punctuation" maxLength={5} />
      <Text style={styles.label}>Duration</Text>
      <View style={styles.chips}>
        {DURATIONS.map((h) => (
          <Pressable key={h} onPress={() => setHours(h)} style={[styles.chip, hours === h && styles.chipActive]} accessibilityRole="button">
            <Text style={[styles.chipTxt, hours === h && styles.chipTxtActive]}>{h}h</Text>
          </Pressable>
        ))}
      </View>
      {validStart ? <Text style={styles.hint}>{formatTime(start)} – {formatTime(end)}</Text> : null}
      {timeError ? <Text style={styles.error}>{timeError}</Text> : null}

      <SectionTitle>2 · Pick a slot</SectionTitle>
      {(slots.data ?? []).length === 0 ? (
        <Text style={styles.hint}>This lot has no slots.</Text>
      ) : (
        <SlotGrid slots={slots.data ?? []} selectedId={slotId} disabledIds={bookedIds} onSelect={(s) => setSlotId(s.id)} />
      )}
      <Text style={styles.hint}>Slots show their live sensor state. Booked slots are greyed out for your time window.</Text>

      <SectionTitle>3 · Vehicle</SectionTitle>
      {(vehicles.data ?? []).map((v) => {
        const active = v.id === vehicleId;
        return (
          <Pressable key={v.id} onPress={() => setVehicleId(v.id)} accessibilityRole="button" style={[styles.vehicle, active && styles.vehicleActive]}>
            <AppIcon name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? COLORS.primary : COLORS.textMuted} />
            <Text style={styles.plate}>{v.vehicle_number}</Text>
            <Text style={styles.hint}>{v.vehicle_type}</Text>
          </Pressable>
        );
      })}
      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <Field icon="add-circle-outline" placeholder="Add vehicle, e.g. TN01AB1234" value={newPlate} onChangeText={(t) => setNewPlate(t.toUpperCase())} autoCapitalize="characters" />
        </View>
        <Button label="Add" small variant="secondary" disabled={newPlate.trim().length < 4} loading={addPlate.isPending} onPress={() => addPlate.mutate()} style={{ marginBottom: SIZES.md }} />
      </View>

      <Card style={{ marginTop: SIZES.sm }}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLbl}>Slot</Text>
          <Text style={styles.sumVal}>{slot ? slot.slot_number : 'Not selected'}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumLbl}>Rate</Text>
          <Text style={styles.sumVal}>{slot ? `${formatMoney(slot.hourly_price)} × ${hours}h` : '—'}</Text>
        </View>
        <View style={[styles.sumRow, { marginTop: 4 }]}>
          <Text style={[styles.sumLbl, { fontWeight: '800', color: COLORS.text }]}>Total</Text>
          <Text style={[styles.sumVal, { fontSize: 20, color: COLORS.primary }]}>{formatMoney(amount)}</Text>
        </View>
      </Card>

      <Button label={`Pay ${formatMoney(amount)} & confirm`} icon="shield-checkmark-outline" disabled={!canConfirm} loading={confirm.isPending} onPress={() => confirm.mutate()} />
      <Text style={[styles.hint, { textAlign: 'center', marginTop: SIZES.sm }]}>Demo payment — no real money is charged.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.md },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  chipTxt: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipTxtActive: { color: COLORS.primary },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: SIZES.sm },
  error: { fontSize: 13, color: COLORS.error, fontWeight: '600', marginBottom: SIZES.sm },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, padding: SIZES.md, borderRadius: SIZES.radius, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.sm },
  vehicleActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  plate: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, marginTop: SIZES.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  sumLbl: { fontSize: 14, color: COLORS.textMuted },
  sumVal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
