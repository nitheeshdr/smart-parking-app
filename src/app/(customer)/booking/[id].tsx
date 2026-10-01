import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, Separator, Spinner, Button } from 'heroui-native';
import { AppIcon } from '../../../components/app-icon';
import { supabase } from '../../../lib/supabase';
import { COLORS, SIZES } from '../../../constants/theme';
import QRCode from 'react-native-qrcode-svg';

export default function BookingTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking_ticket', id],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('bookings')
        .select(
          'booking_reference, qr_token, date, start_time, end_time, total_amount, booking_status, payment_status, parking_lots(name, address), parking_slots(slot_number), vehicles(vehicle_number)'
        )
        .eq('id', id)
        .single();
      if (qErr) throw qErr;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <AppIcon name="alert-circle-outline" size={40} color={COLORS.error} />
        <Text style={styles.errorTxt}>Ticket not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <AppIcon name="chevron-back" size={14} color={COLORS.primary} />
          <Text style={styles.backLinkTxt}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const lot = booking.parking_lots as unknown as { name: string; address: string } | null;
  const slot = booking.parking_slots as unknown as { slot_number: string } | null;
  const vehicle = booking.vehicles as unknown as { vehicle_number: string } | null;
  const isPaid = booking.payment_status === 'paid';
  const isConfirmed = booking.booking_status === 'confirmed' || booking.booking_status === 'active';

  const DETAILS = [
    { label: 'Reference', value: booking.booking_reference, icon: 'document-text-outline' as const },
    { label: 'Slot', value: slot?.slot_number ?? '—', icon: 'grid-outline' as const },
    { label: 'Vehicle', value: vehicle?.vehicle_number ?? '—', icon: 'car-outline' as const },
    { label: 'Date', value: booking.date, icon: 'calendar-outline' as const },
    { label: 'Time', value: `${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)}`, icon: 'time-outline' as const },
    { label: 'Amount Paid', value: `\u20B9${booking.total_amount}`, icon: 'card-outline' as const },
  ];

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
        <Text style={styles.title}>Parking Ticket</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.ticket}>
          {/* Lot info */}
          <View style={styles.ticketTop}>
            <View style={styles.lotIconWrap}>
              <AppIcon name="business-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lotName}>{lot?.name ?? '—'}</Text>
              <Text style={styles.lotAddress}>{lot?.address ?? '—'}</Text>
            </View>
            <AppIcon
              name={isConfirmed ? 'checkmark-circle' : 'time-outline'}
              size={28}
              color={isConfirmed ? COLORS.success : COLORS.warning}
            />
          </View>

          <Separator style={styles.sep} />

          {/* QR Token area */}
          <View style={styles.qrWrap}>
            <View style={styles.qrIcon}>
              <QRCode
                value={booking.qr_token || (id as string)}
                size={100}
                color={COLORS.text}
                backgroundColor="transparent"
              />
            </View>
            <Text style={styles.qrLbl}>Show this code at the entrance</Text>
            <View style={styles.tokenBox}>
              <AppIcon name="key-outline" size={14} color={COLORS.primary} />
              <Text selectable style={styles.token}>{booking.qr_token ?? 'Not available'}</Text>
            </View>
          </View>

          <Separator style={styles.sep} />

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: isPaid ? COLORS.successLight : COLORS.warningLight }]}>
              <AppIcon
                name={isPaid ? 'checkmark-circle-outline' : 'time-outline'}
                size={13}
                color={isPaid ? COLORS.success : COLORS.warning}
              />
              <Text style={[styles.statusTxt, { color: isPaid ? COLORS.success : COLORS.warning }]}>
                Payment {booking.payment_status}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isConfirmed ? COLORS.primaryLight : COLORS.border }]}>
              <AppIcon
                name={isConfirmed ? 'shield-checkmark-outline' : 'ellipse-outline'}
                size={13}
                color={isConfirmed ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.statusTxt, { color: isConfirmed ? COLORS.primary : COLORS.textMuted }]}>
                {booking.booking_status}
              </Text>
            </View>
          </View>

          <Separator style={styles.sep} />

          {/* Details */}
          {DETAILS.map((d, i) => (
            <View key={i}>
              {i > 0 && <Separator style={styles.innerSep} />}
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <AppIcon name={d.icon} size={15} color={COLORS.textMuted} />
                  <Text style={styles.detailLabel}>{d.label}</Text>
                </View>
                <Text selectable={d.label === 'Reference'} style={styles.detailValue}>{d.value}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Text style={styles.helpTxt}>
          The parking manager can verify this ticket by scanning the QR token above.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={() => router.replace('/(customer)/(tabs)/bookings')}
          style={styles.doneBtn}
        >
          <View style={styles.doneBtnInner}>
            <AppIcon name="checkmark-outline" size={18} color="#fff" />
            <Text style={styles.doneBtnTxt}>Done</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorTxt: { color: COLORS.error, fontSize: 15, textAlign: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkTxt: { color: COLORS.primary, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.text },

  scroll: { padding: SIZES.lg },
  ticket: { padding: SIZES.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },

  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  lotIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  lotName: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  lotAddress: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  sep: { marginVertical: SIZES.lg },
  innerSep: { marginVertical: SIZES.xs },

  qrWrap: { alignItems: 'center', gap: SIZES.sm },
  qrIcon: {
    width: 120, height: 120, borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  qrLbl: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  tokenBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingHorizontal: SIZES.md, paddingVertical: 8 },
  token: { color: COLORS.primary, fontWeight: '800', fontSize: 14, letterSpacing: 1 },

  statusRow: { flexDirection: 'row', gap: SIZES.sm, flexWrap: 'wrap' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SIZES.sm },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  detailLabel: { fontSize: 14, color: COLORS.textMuted },
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: SIZES.sm },

  helpTxt: { color: COLORS.textMuted, textAlign: 'center', marginTop: SIZES.lg, lineHeight: 20, fontSize: 13 },

  footer: { padding: SIZES.lg, paddingBottom: Platform.OS === 'ios' ? SIZES.xxl : SIZES.lg, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  doneBtn: { height: 52, borderRadius: SIZES.radiusMd },
  doneBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  doneBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

