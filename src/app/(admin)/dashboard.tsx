import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Separator, Spinner } from 'heroui-native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

export default function AdminDashboard() {
  const { signOut } = useAuthStore();
  const queryClient = useQueryClient();

  /* ── Real-time subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin_recent_bookings'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin_stats'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [users, managers, lots, slots, todayB, allB, revenue] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('parking_managers').select('id', { count: 'exact', head: true }),
        supabase.from('parking_lots').select('id, available_capacity', { count: 'exact' }),
        supabase.from('parking_slots').select('id, status', { count: 'exact' }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('date', today),
        supabase.from('bookings').select('total_amount, payment_status'),
        supabase.from('bookings').select('total_amount').eq('payment_status', 'paid'),
      ]);
      const totalRevenue = revenue.data?.reduce((s, b) => s + Number(b.total_amount), 0) ?? 0;
      const pendingPayments = allB.data?.filter((b) => b.payment_status === 'pending').length ?? 0;
      const totalFreeSlots = lots.data?.reduce((s, l) => s + l.available_capacity, 0) ?? 0;
      return {
        users: users.count ?? 0,
        managers: managers.count ?? 0,
        lots: lots.count ?? 0,
        slots: slots.count ?? 0,
        todayBookings: todayB.count ?? 0,
        totalRevenue,
        pendingPayments,
        freeSlots: totalFreeSlots,
      };
    },
  });

  const { data: recentBookings } = useQuery({
    queryKey: ['admin_recent_bookings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_reference, date, total_amount, booking_status, payment_status, profiles(full_name), parking_lots(name)')
        .order('created_at', { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const STAT_CARDS = stats ? [
    { label: 'Total Users',    value: stats.users,         icon: 'people-outline' as const,       color: COLORS.primary,  bg: COLORS.primaryLight },
    { label: 'Managers',       value: stats.managers,      icon: 'business-outline' as const,     color: COLORS.accent,   bg: COLORS.accentLight },
    { label: 'Parking Lots',   value: stats.lots,          icon: 'map-outline' as const,          color: COLORS.info,     bg: COLORS.infoLight },
    { label: 'Today Bookings', value: stats.todayBookings, icon: 'calendar-outline' as const,     color: COLORS.success,  bg: COLORS.successLight },
    { label: 'Free Slots',     value: stats.freeSlots,     icon: 'checkmark-circle-outline' as const, color: COLORS.success, bg: COLORS.successLight },
    { label: 'Pending Pay',    value: stats.pendingPayments, icon: 'time-outline' as const,        color: COLORS.warning,  bg: COLORS.warningLight },
  ] : [];

  const STATUS_COLOR: Record<string, string> = {
    confirmed: COLORS.success, pending: COLORS.warning, active: COLORS.primary,
    completed: COLORS.textMuted, cancelled: COLORS.error,
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <Pressable style={styles.signOutBtn} onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out">
          <AppIcon name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.signOutTxt}>Logout</Text>
        </Pressable>
      </View>

      {/* Revenue banner */}
      <View style={styles.revenueBanner}>
        <View style={styles.revenuLeft}>
          <AppIcon name="trending-up-outline" size={20} color={COLORS.primary} />
          <Text style={styles.revenueLbl}>Total Revenue</Text>
        </View>
        <Text style={styles.revenueAmt}>
          {isLoading ? '…' : `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
        </Text>
      </View>

      {/* Stat grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        {isLoading ? (
          <View style={styles.center}><Spinner size="lg" /></View>
        ) : (
          <View style={styles.grid}>
            {STAT_CARDS.map((s, i) => (
              <Card key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <AppIcon name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </Card>
            ))}
          </View>
        )}
      </View>

      <Separator style={styles.divider} />

      {/* Recent bookings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        <Card style={styles.tableCard}>
          {!recentBookings?.length ? (
            <View style={styles.emptyRow}>
              <AppIcon name="receipt-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>No bookings yet</Text>
            </View>
          ) : recentBookings.map((b, i) => {
            const profile = b.profiles as any;
            const lot = b.parking_lots as any;
            const sColor = STATUS_COLOR[b.booking_status] ?? COLORS.textMuted;
            return (
              <View key={b.id}>
                {i > 0 && <Separator style={styles.innerSep} />}
                <View style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingRef}>{b.booking_reference}</Text>
                    <Text style={styles.bookingUser}>{profile?.full_name ?? '—'} · {lot?.name ?? '—'}</Text>
                    <Text style={styles.bookingDate}>{b.date}</Text>
                  </View>
                  <View style={styles.bookingRight}>
                    <Text style={styles.bookingAmt}>₹{b.total_amount}</Text>
                    <View style={[styles.statusPill, { backgroundColor: sColor + '18' }]}>
                      <Text style={[styles.statusPillTxt, { color: sColor }]}>{b.booking_status}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { padding: SIZES.xl, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.errorLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  signOutTxt: { color: COLORS.error, fontSize: 13, fontWeight: '700' },

  revenueBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.primaryLight, borderBottomWidth: 1, borderBottomColor: COLORS.primaryMid,
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md,
  },
  revenuLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueLbl: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  revenueAmt: { fontSize: 22, fontWeight: '900', color: COLORS.primary },

  section: { padding: SIZES.lg },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: SIZES.md },
  divider: { marginHorizontal: SIZES.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.md },
  statCard: {
    width: '47%', padding: SIZES.md, gap: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statNum: { fontSize: 26, fontWeight: '900' },
  statLbl: { fontSize: 12, color: COLORS.textMuted },

  tableCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, padding: SIZES.md },
  bookingRef: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  bookingUser: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  bookingDate: { fontSize: 11, color: COLORS.textDisabled, marginTop: 1 },
  bookingRight: { alignItems: 'flex-end', gap: 5 },
  bookingAmt: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  innerSep: { marginHorizontal: SIZES.md },

  emptyRow: { padding: SIZES.xl, alignItems: 'center', gap: SIZES.sm },
  emptyTxt: { color: COLORS.textMuted, fontSize: 14 },
});
