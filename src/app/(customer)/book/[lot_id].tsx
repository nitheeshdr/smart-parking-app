import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Separator, Spinner } from 'heroui-native';
import { AppIcon } from '../../../components/app-icon';
import { createAndPayForBooking, fetchParkingSlots } from '../../../features/parking/api/parkingApi';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { COLORS, SIZES } from '../../../constants/theme';

const today = new Date().toISOString().slice(0, 10);

type SlotType = 'regular' | 'disabled' | 'ev' | 'premium' | 'reserved';
const SLOT_ICON: Record<SlotType, 'car-outline' | 'accessibility-outline' | 'flash-outline' | 'star-outline' | 'lock-closed-outline'> = {
  regular: 'car-outline',
  disabled: 'accessibility-outline',
  ev: 'flash-outline',
  premium: 'star-outline',
  reserved: 'lock-closed-outline',
};

export default function BookParkingScreen() {
  const { lot_id } = useLocalSearchParams<{ lot_id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', lot_id],
    queryFn: () => fetchParkingSlots(lot_id),
    enabled: !!lot_id,
  });

  const { data: bookingsForDate } = useQuery({
    queryKey: ['lot_bookings_date', lot_id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('parking_slot_id, start_time, end_time, booking_status')
        .eq('parking_lot_id', lot_id)
        .eq('date', date)
        .neq('booking_status', 'cancelled');
      if (error) throw error;
      return data || [];
    },
    enabled: !!lot_id && !!date,
  });

  React.useEffect(() => {
    if (!lot_id) return;
    const channel = supabase
      .channel(`lot_realtime_${lot_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `parking_lot_id=eq.${lot_id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lot_bookings_date', lot_id, date] });
          queryClient.invalidateQueries({ queryKey: ['slots', lot_id] });
          queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_slots', filter: `parking_lot_id=eq.${lot_id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['slots', lot_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lot_id, date, queryClient]);

  const isSlotBookedForTime = (slotId: string) => {
    if (!bookingsForDate || bookingsForDate.length === 0) return false;
    const sStart = startTime.length === 5 ? `${startTime}:00` : startTime;
    const sEnd = endTime.length === 5 ? `${endTime}:00` : endTime;

    return bookingsForDate.some((b: any) => {
      if (b.parking_slot_id !== slotId) return false;
      const bStart = b.start_time;
      const bEnd = b.end_time;
      return bStart < sEnd && sStart < bEnd;
    });
  };

  const selected = useMemo(() => slots?.find((s) => s.id === selectedSlot), [selectedSlot, slots]);

  const booking = useMutation({
    mutationFn: () => {
      if (!user?.id || !selected) throw new Error('Select an available slot first.');
      if (isSlotBookedForTime(selected.id)) {
        throw new Error('This slot is already booked for the selected time range.');
      }
      return createAndPayForBooking({
        customerId: user.id, lotId: lot_id, slotId: selected.id,
        vehicleNumber, date, startTime, endTime,
        hourlyPrice: Number(selected.hourly_price),
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my_bookings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['slots', lot_id] });
      queryClient.invalidateQueries({ queryKey: ['lot_bookings_date', lot_id, date] });
      router.replace(`/(customer)/booking/${result.booking_id}`);
    },
    onError: (err: Error) => Alert.alert('Booking failed', err.message),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Spinner size="lg" />
        <Text style={styles.loadingTxt}>Loading slots…</Text>
      </View>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <View style={styles.center}>
        <AppIcon name="grid-outline" size={40} color={COLORS.textMuted} />
        <Text style={styles.errorTxt}>No slots available for this lot.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <AppIcon name="chevron-back" size={14} color={COLORS.primary} />
          <Text style={styles.backLinkTxt}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Count free slots for the selected date/time
  const availableCount = slots.filter((s) => s.status === 'available' && !isSlotBookedForTime(s.id)).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Reserve a Slot</Text>
        <View style={styles.availChip}>
          <Text style={styles.availChipTxt}>{availableCount} free</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Choose slot ── */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
          <Text style={styles.stepTitle}>Choose a space</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { label: 'Available', bg: COLORS.surface, border: COLORS.border, text: COLORS.text },
            { label: 'Selected', bg: COLORS.primaryLight, border: COLORS.primary, text: COLORS.primary },
            { label: 'Taken', bg: COLORS.surfaceHover, border: COLORS.border, text: COLORS.textDisabled },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: l.bg, borderColor: l.border }]} />
              <Text style={styles.legendTxt}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* Slot grid */}
        <View style={styles.grid}>
          {slots.map((slot) => {
            const isBooked = isSlotBookedForTime(slot.id);
            const isAvailable = slot.status === 'available' && !isBooked;
            const isSelected = selectedSlot === slot.id;
            const icon = SLOT_ICON[slot.slot_type as SlotType] ?? 'car-outline';
            return (
              <Pressable
                key={slot.id}
                disabled={!isAvailable}
                onPress={() => setSelectedSlot(slot.id)}
                style={[
                  styles.slotCell,
                  !isAvailable && styles.slotCellTaken,
                  isSelected && styles.slotCellSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Slot ${slot.slot_number}, ${isAvailable ? 'available' : 'taken'}`}
              >
                <AppIcon
                  name={icon}
                  size={16}
                  color={isSelected ? COLORS.primary : !isAvailable ? COLORS.textDisabled : COLORS.textMuted}
                />
                <Text style={[
                  styles.slotNum,
                  !isAvailable && styles.slotNumTaken,
                  isSelected && styles.slotNumSelected,
                ]}>
                  {slot.slot_number}
                </Text>
                <Text style={[
                  styles.slotType,
                  !isAvailable && styles.slotNumTaken,
                  isSelected && { color: COLORS.primary },
                ]}>
                  {isBooked ? 'Booked' : slot.slot_type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Separator style={styles.sep} />

        {/* ── Step 2: Details ── */}
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
          <Text style={styles.stepTitle}>Booking details</Text>
        </View>

        <Card style={styles.formCard}>
          <Field label="Vehicle registration">
            <TextInput
              style={styles.input}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
              placeholder="TN 01 AB 1234"
              placeholderTextColor={COLORS.textMuted}
            />
          </Field>

          <Separator style={styles.sep} />

          <Field label="Date (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-10-01"
              placeholderTextColor={COLORS.textMuted}
            />
          </Field>

          <Separator style={styles.sep} />

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Field label="Start time">
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </Field>
            </View>
            <View style={styles.timeSep}>
              <AppIcon name="arrow-forward-outline" size={16} color={COLORS.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="End time">
                <TextInput
                  style={styles.input}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:00"
                  placeholderTextColor={COLORS.textMuted}
                />
              </Field>
            </View>
          </View>
        </Card>

        {/* Selected slot summary */}
        {selected && (
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <AppIcon name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.summaryTxt}>
                Slot {selected.slot_number} · {selected.slot_type} ·{'\u20B9'}{selected.hourly_price}/hr
              </Text>
            </View>
          </Card>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPrice}>
            {selected ? `\u20B9${selected.hourly_price}/hr` : 'Select a slot'}
          </Text>
          <Text style={styles.footerNote}>Secure payment · E-ticket included</Text>
        </View>
        <Button
          variant="primary"
          isDisabled={!selectedSlot || booking.isPending}
          onPress={() => booking.mutate()}
          style={styles.confirmBtn}
        >
          <View style={styles.confirmBtnInner}>
            <AppIcon name="card-outline" size={16} color="#fff" />
            <Text style={styles.confirmBtnTxt}>
              {booking.isPending ? 'Processing…' : 'Confirm & Pay'}
            </Text>
          </View>
        </Button>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.fieldLbl}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: COLORS.textMuted, fontSize: 14 },
  errorTxt: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center', paddingHorizontal: SIZES.lg },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  backLinkTxt: { color: COLORS.primary, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  availChip: { backgroundColor: COLORS.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  availChipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.success },

  scroll: { padding: SIZES.lg, paddingBottom: 140 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.md },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '900' },
  stepTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  legend: { flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendTxt: { fontSize: 12, color: COLORS.textMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.md },
  slotCell: {
    width: '30.6%', aspectRatio: 1, borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  slotCellTaken: { backgroundColor: COLORS.surfaceHover, opacity: 0.5 },
  slotCellSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary, borderWidth: 2 },
  slotNum: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  slotNumTaken: { color: COLORS.textDisabled },
  slotNumSelected: { color: COLORS.primary },
  slotType: { fontSize: 10, color: COLORS.textMuted, textTransform: 'capitalize' },

  sep: { marginVertical: SIZES.md },

  formCard: { padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: SIZES.xs },
  fieldLbl: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: SIZES.md, height: 46, color: COLORS.text, fontSize: 15,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  timeSep: { paddingTop: 20 },

  summaryCard: { marginTop: SIZES.md, padding: SIZES.md, borderWidth: 1, borderColor: COLORS.success + '40', backgroundColor: COLORS.successLight },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  summaryTxt: { fontSize: 14, fontWeight: '700', color: COLORS.success },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingBottom: Platform.OS === 'ios' ? SIZES.xxl : SIZES.lg,
    paddingTop: SIZES.md,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  footerPrice: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  footerNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  confirmBtn: { height: 50, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.md },
  confirmBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
