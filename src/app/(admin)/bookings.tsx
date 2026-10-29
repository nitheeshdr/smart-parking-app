import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelBooking, checkInBooking, checkOutBooking, fetchStaffBookings } from '../../api/bookings';
import { Button, EmptyState, ErrorState, Loading, Screen, Segmented } from '../../components/ui';
import { BookingCard } from '../../components/booking-card';
import { errorMessage } from '../../lib/format';
import type { Booking } from '../../types/db';

type Tab = 'now' | 'upcoming' | 'past';

export default function AdminBookings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('now');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ['all_bookings'], queryFn: () => fetchStaffBookings({ limit: 200 }) });

  const run = useMutation({
    mutationFn: (v: { kind: 'in' | 'out' | 'cancel'; id: string }) => (v.kind === 'in' ? checkInBooking(v.id) : v.kind === 'out' ? checkOutBooking(v.id) : cancelBooking(v.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['staff_bookings'] });
    },
    onError: (e) => Alert.alert('Action failed', errorMessage(e)),
  });

  const list = useMemo(() => {
    const all = data ?? [];
    if (tab === 'now') return all.filter((b) => b.booking_status === 'active');
    if (tab === 'upcoming') return all.filter((b) => b.booking_status === 'confirmed' || b.booking_status === 'pending');
    return all.filter((b) => ['completed', 'cancelled', 'expired', 'no_show'].includes(b.booking_status));
  }, [data, tab]);

  const actions = (b: Booking) => (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
      {b.booking_status === 'confirmed' ? <Button label="Check in" small icon="log-in-outline" style={{ flex: 1 }} onPress={() => run.mutate({ kind: 'in', id: b.id })} /> : null}
      {b.booking_status === 'active' ? <Button label="Check out" small icon="log-out-outline" style={{ flex: 1 }} onPress={() => run.mutate({ kind: 'out', id: b.id })} /> : null}
      {b.booking_status === 'confirmed' || b.booking_status === 'pending' ? (
        <Button
          label="Cancel"
          small
          variant="danger"
          style={{ flex: 1 }}
          onPress={() => Alert.alert('Cancel this booking?', 'The customer is refunded.', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel booking', style: 'destructive', onPress: () => run.mutate({ kind: 'cancel', id: b.id }) }])}
        />
      ) : null}
    </View>
  );

  return (
    <Screen title="Bookings" subtitle="All customer bookings, live" refreshing={isRefetching} onRefresh={refetch}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'now', label: 'Parked now' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon="receipt-outline" title="Nothing here" hint={tab === 'now' ? 'No vehicles are checked in.' : undefined} />
      ) : (
        list.map((b) => <BookingCard key={b.id} booking={b} showCustomer footer={actions(b)} />)
      )}
    </Screen>
  );
}
