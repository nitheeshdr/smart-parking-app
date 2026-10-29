import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchMyBookings } from '../../../api/bookings';
import { useAuthStore } from '../../../stores/authStore';
import { Button, EmptyState, ErrorState, Loading, Screen, Segmented } from '../../../components/ui';
import { BookingCard } from '../../../components/booking-card';

export default function MyBookingsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ['my_bookings', userId], queryFn: () => fetchMyBookings(userId), enabled: !!userId });

  const list = useMemo(() => {
    const live = (s: string) => s === 'pending' || s === 'confirmed' || s === 'active';
    return (data ?? []).filter((b) => (tab === 'upcoming' ? live(b.booking_status) : !live(b.booking_status)));
  }, [data, tab]);

  return (
    <Screen title="My bookings" subtitle="Tickets update live" refreshing={isRefetching} onRefresh={refetch}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="ticket-outline"
          title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          hint={tab === 'upcoming' ? 'Find a lot and book your first slot.' : undefined}
          action={tab === 'upcoming' ? <Button label="Find parking" variant="secondary" onPress={() => router.push('/(customer)/(tabs)/explore')} /> : undefined}
        />
      ) : (
        list.map((b) => <BookingCard key={b.id} booking={b} onPress={() => router.push(`/(customer)/booking/${b.id}`)} />)
      )}
    </Screen>
  );
}
