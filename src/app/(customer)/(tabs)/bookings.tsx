import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, Spinner, Chip, Separator } from 'heroui-native';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';

type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired' | 'no_show';

const STATUS_STYLE: Record<BookingStatus, { bg: string; text: string; icon: string }> = {
  pending:   { bg: COLORS.warningLight,  text: COLORS.warning,  icon: 'time-outline' },
  confirmed: { bg: COLORS.primaryLight,  text: COLORS.primary,  icon: 'checkmark-circle-outline' },
  active:    { bg: COLORS.successLight,  text: COLORS.success,  icon: 'car-outline' },
  completed: { bg: COLORS.surfaceHover,text: COLORS.textMuted, icon: 'checkmark-done-outline' },
  cancelled: { bg: COLORS.errorLight,    text: COLORS.error,    icon: 'close-circle-outline' },
  expired:   { bg: COLORS.borderStrong,  text: COLORS.textMuted, icon: 'alert-circle-outline' },
  no_show:   { bg: COLORS.errorLight,    text: COLORS.error,    icon: 'ban-outline' },
};

export default function CustomerBookingsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user_bookings_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my_bookings', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['my_bookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, booking_reference, date, start_time, end_time, total_amount, booking_status, payment_status, parking_lots(name, address), parking_slots(slot_number)'
        )
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Spinner size="lg" />
        <Text style={styles.loadingTxt}>Loading your bookings…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeTxt}>{bookings?.length ?? 0}</Text>
        </View>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppIcon name="ticket-outline" size={52} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Your parking tickets will appear here after you book a slot.</Text>
            <Pressable
              style={styles.exploreBtn}
              onPress={() => router.push('/(customer)/(tabs)/explore')}
              accessibilityRole="button"
              accessibilityLabel="Explore parking lots"
            >
              <AppIcon name="compass-outline" size={16} color={COLORS.primary} />
              <Text style={styles.exploreBtnTxt}>Explore Lots</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const lot = item.parking_lots as unknown as { name: string; address: string } | null;
          const slot = item.parking_slots as unknown as { slot_number: string } | null;
          const status = (item.booking_status ?? 'pending') as BookingStatus;
          const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
          const isPaid = item.payment_status === 'paid';

          return (
            <Pressable
              onPress={() => router.push(`/(customer)/booking/${item.id}`)}
              style={({ pressed }) => [pressed && { opacity: 0.95 }]}
              accessibilityRole="button"
              accessibilityLabel={`View booking at ${lot?.name}`}
            >
              <Card style={styles.card}>
                {/* Top */}
                <View style={styles.cardTop}>
                  <View style={styles.lotInfo}>
                    <Text style={styles.lotName} numberOfLines={1}>{lot?.name ?? '—'}</Text>
                    <View style={styles.addressRow}>
                      <AppIcon name="location-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.lotAddress} numberOfLines={1}>{lot?.address ?? '—'}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <AppIcon name={s.icon as never} size={12} color={s.text} />
                    <Text style={[styles.statusTxt, { color: s.text }]}>
                      {status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                {/* Details */}
                <View style={styles.detailsRow}>
                  <View style={styles.detail}>
                    <AppIcon name="car-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>{slot?.slot_number ?? '—'}</Text>
                  </View>
                  <View style={styles.detail}>
                    <AppIcon name="calendar-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>{item.date}</Text>
                  </View>
                  <View style={styles.detail}>
                    <AppIcon name="time-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>
                      {item.start_time?.slice(0, 5)} – {item.end_time?.slice(0, 5)}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.amtRow}>
                    <AppIcon name="card-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.amount}>{'\u20B9'}{item.total_amount}</Text>
                    <View style={[styles.payBadge, { backgroundColor: isPaid ? COLORS.successLight : COLORS.warningLight }]}>
                      <Text style={[styles.payBadgeTxt, { color: isPaid ? COLORS.success : COLORS.warning }]}>
                        {item.payment_status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.viewLink}>
                    <Text style={styles.viewLinkTxt}>View ticket</Text>
                    <AppIcon name="chevron-forward" size={15} color={COLORS.primary} />
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: COLORS.textMuted, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  countBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countBadgeTxt: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  list: { padding: SIZES.lg, gap: SIZES.md },
  card: { padding: SIZES.lg, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SIZES.sm },
  lotInfo: { flex: 1 },
  lotName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lotAddress: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  sep: { marginVertical: SIZES.md },

  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.md, marginBottom: SIZES.md },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailTxt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  amount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  payBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  payBadgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewLinkTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: SIZES.xl, gap: SIZES.md },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SIZES.sm,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm,
    borderRadius: 20,
  },
  exploreBtnTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
