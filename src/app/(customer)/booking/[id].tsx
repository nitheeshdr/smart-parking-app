import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { cancelBooking, fetchBooking } from '../../../api/bookings';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';
import { Badge, Button, Card, ErrorState, Loading, Row, Screen } from '../../../components/ui';
import { BOOKING_TONE } from '../../../components/ui/status';
import { COLORS, SIZES } from '../../../constants/theme';
import { errorMessage, formatDate, formatDateTime, formatMoney, formatTime } from '../../../lib/format';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  useRealtimeSync(`ticket_${id}`, ['bookings'], [['booking', id], ['my_bookings']]);
  const { data: b, isLoading, error, refetch } = useQuery({ queryKey: ['booking', id], queryFn: () => fetchBooking(id), enabled: !!id });

  const cancel = useMutation({
    mutationFn: () => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['my_bookings'] });
    },
    onError: (e) => Alert.alert('Could not cancel', errorMessage(e)),
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(customer)/(tabs)/bookings'));
  if (isLoading) return <Screen title="Ticket" onBack={back} scroll={false}><Loading /></Screen>;
  if (error || !b) return <Screen title="Ticket" onBack={back}><ErrorState error={error ?? new Error('Ticket not found.')} onRetry={refetch} /></Screen>;

  const upcoming = b.booking_status === 'confirmed' || b.booking_status === 'pending';
  const showQr = !!b.qr_token && (b.booking_status === 'confirmed' || b.booking_status === 'active');

  const confirmCancel = () =>
    Alert.alert('Cancel this booking?', 'Your payment will be refunded.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: () => cancel.mutate() },
    ]);

  return (
    <Screen title="Your ticket" subtitle={b.parking_lots?.name} onBack={back} refreshing={false} onRefresh={refetch}>
      <Card style={styles.qrCard}>
        <Badge tone={BOOKING_TONE[b.booking_status]} />
        {showQr ? (
          <>
            <View style={styles.qrBox}>
              <QRCode value={b.qr_token!} size={190} />
            </View>
            <Text style={styles.token}>{b.qr_token}</Text>
            <Text style={styles.hint}>Show this to the lot manager when you arrive.</Text>
          </>
        ) : (
          <Text style={[styles.hint, { marginTop: SIZES.md }]}>
            {b.booking_status === 'completed' ? 'This visit is complete. Thanks for parking with us!' : 'This ticket is no longer valid.'}
          </Text>
        )}
      </Card>

      <Card>
        <Row icon="document-text-outline" label="Reference" value={b.booking_reference} />
        <Row icon="location-outline" label="Lot" value={`${b.parking_lots?.name ?? ''}${b.parking_lots?.city ? `, ${b.parking_lots.city}` : ''}`} />
        <Row icon="grid-outline" label="Slot" value={b.parking_slots?.slot_number ?? '—'} />
        <Row icon="car-outline" label="Vehicle" value={b.vehicles?.vehicle_number ?? '—'} />
        <Row icon="calendar-outline" label="Date" value={formatDate(b.date)} />
        <Row icon="time-outline" label="Time" value={`${formatTime(b.start_time)} – ${formatTime(b.end_time)}`} />
        <Row icon="card-outline" label="Amount" value={`${formatMoney(b.total_amount)} (${b.payment_status})`} />
        {b.checked_in_at ? <Row icon="log-in-outline" label="Checked in" value={formatDateTime(b.checked_in_at)} /> : null}
        {b.checked_out_at ? <Row icon="log-out-outline" label="Checked out" value={formatDateTime(b.checked_out_at)} /> : null}
      </Card>

      {upcoming ? <Button label="Cancel booking" variant="danger" icon="close-circle-outline" loading={cancel.isPending} onPress={confirmCancel} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignItems: 'center', gap: SIZES.sm },
  qrBox: { padding: SIZES.md, backgroundColor: '#fff', borderRadius: SIZES.radiusMd, marginTop: SIZES.sm },
  token: { fontSize: 18, fontWeight: '900', letterSpacing: 1.5, color: COLORS.text },
  hint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});
