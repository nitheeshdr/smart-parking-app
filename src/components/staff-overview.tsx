import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchAllLots, fetchSlotsForLots } from '../api/lots';
import { fetchGateSystem, fetchStaffBookings } from '../api/bookings';
import { AppIcon } from './app-icon';
import { BookingCard } from './booking-card';
import { SlotGrid } from './slot-grid';
import { Badge, Card, EmptyState, ErrorState, Loading, SectionTitle, StatCard, StatGrid } from './ui';
import { COLORS, SIZES } from '../constants/theme';
import { formatDateTime, formatMoney, isoDate } from '../lib/format';

/**
 * Live operations overview for the admin:
 * gate counter, slot availability per lot (straight from the sensors) and booking activity.
 */
export function StaffOverview() {

  const lots = useQuery({ queryKey: ['all_lots'], queryFn: fetchAllLots });
  const lotIds = (lots.data ?? []).map((l) => l.id);
  const slots = useQuery({ queryKey: ['staff_slots', lotIds.join(',')], queryFn: () => fetchSlotsForLots(lotIds), enabled: lots.isSuccess });
  const bookings = useQuery({ queryKey: ['staff_bookings', 'recent'], queryFn: () => fetchStaffBookings({ limit: 40 }), enabled: lots.isSuccess });
  const gate = useQuery({ queryKey: ['gate'], queryFn: fetchGateSystem });

  const today = isoDate();
  const stats = useMemo(() => {
    const s = slots.data ?? [];
    const b = bookings.data ?? [];
    const todays = b.filter((x) => x.date === today && x.booking_status !== 'cancelled');
    return {
      free: s.filter((x) => x.status === 'available').length,
      occupied: s.filter((x) => x.status === 'occupied').length,
      bookingsToday: todays.length,
      parked: b.filter((x) => x.booking_status === 'active').length,
      revenueToday: todays.filter((x) => x.payment_status === 'paid').reduce((sum, x) => sum + Number(x.total_amount), 0),
    };
  }, [slots.data, bookings.data, today]);

  if (lots.isLoading) return <Loading label="Loading your lots…" />;
  if (lots.error) return <ErrorState error={lots.error} onRetry={lots.refetch} />;

  return (
    <View>
      {gate.data ? (
        <Card style={styles.gate}>
          <View style={styles.gateIcon}>
            <AppIcon name="swap-vertical-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gateTitle}>Gate · {gate.data.car_count} car{gate.data.car_count === 1 ? '' : 's'} inside</Text>
            <Text style={styles.gateSub}>Updated {formatDateTime(gate.data.updated_at)}</Text>
          </View>
          <Badge
            tone={gate.data.gate_status === 'open' ? { fg: COLORS.success, bg: COLORS.successLight, label: 'Open' } : { fg: COLORS.textMuted, bg: COLORS.surfaceHover, label: 'Closed' }}
          />
        </Card>
      ) : null}

      <StatGrid>
        <StatCard label="Free slots" value={stats.free} icon="checkmark-circle-outline" color={COLORS.success} />
        <StatCard label="Occupied" value={stats.occupied} icon="car-outline" color={COLORS.error} />
        <StatCard label="Bookings today" value={stats.bookingsToday} icon="calendar-outline" />
        <StatCard label="Revenue today" value={formatMoney(stats.revenueToday)} icon="cash-outline" color={COLORS.accent} hint={`${stats.parked} parked now`} />
      </StatGrid>

      <SectionTitle>Live slots</SectionTitle>
      {(lots.data ?? []).length === 0 ? (
        <EmptyState icon="business-outline" title="No lots yet" hint="Run the database setup script to create the lot." />
      ) : (
        (lots.data ?? []).map((lot) => {
          const lotSlots = (slots.data ?? []).filter((s) => s.parking_lot_id === lot.id);
          return (
            <Card key={lot.id}>
              <View style={styles.lotTop}>
                <Text style={styles.lotName} numberOfLines={1}>{lot.name}</Text>
                <Text style={styles.lotCount}>{lot.available_capacity}/{lot.total_capacity} free</Text>
              </View>
              {lotSlots.length ? <SlotGrid slots={lotSlots} showPrice={false} /> : <Text style={styles.empty}>No slots yet.</Text>}
            </Card>
          );
        })
      )}

      <SectionTitle>Recent bookings</SectionTitle>
      {(bookings.data ?? []).length === 0 ? (
        <Text style={styles.empty}>No bookings yet.</Text>
      ) : (
        (bookings.data ?? []).slice(0, 6).map((b) => <BookingCard key={b.id} booking={b} showCustomer />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  gateIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  gateSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  lotTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  lotName: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  lotCount: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  empty: { fontSize: 13, color: COLORS.textMuted },
});
