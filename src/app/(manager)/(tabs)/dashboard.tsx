import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, Separator, Spinner, Button } from 'heroui-native';
import { fetchManagerDashboardStats, fetchManagerRecentBookings } from '../../../features/parking/api/managerApi';
import { useAuthStore } from '../../../stores/authStore';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';

export default function ManagerDashboardScreen() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const managerId = user?.id ?? '';

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['manager_stats', managerId],
    queryFn: () => fetchManagerDashboardStats(managerId),
    enabled: !!managerId,
  });

  const { data: recent } = useQuery({
    queryKey: ['manager_recent_bookings', managerId],
    queryFn: () => fetchManagerRecentBookings(managerId),
    enabled: !!managerId,
  });

  const STAT_CARDS = [
    {
      label: "Today's Bookings",
      value: stats?.todayBookings ?? 0,
      icon: 'calendar-outline' as const,
      color: COLORS.primary,
      bg: COLORS.primaryLight,
    },
    {
      label: 'Revenue',
      value: `\u20B9${stats?.revenue ?? 0}`,
      icon: 'cash-outline' as const,
      color: COLORS.success,
      bg: COLORS.successLight,
    },
    {
      label: 'Active Vehicles',
      value: stats?.activeVehicles ?? 0,
      icon: 'car-outline' as const,
      color: COLORS.warning,
      bg: COLORS.warningLight,
    },
    {
      label: 'Available Slots',
      value: stats?.availableSlots ?? 0,
      icon: 'grid-outline' as const,
      color: COLORS.accent,
      bg: COLORS.accentLight,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.user_metadata?.full_name || 'Manager'}</Text>
        </View>
        <Pressable
          onPress={signOut}
          style={styles.signOutBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <AppIcon name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.signOutTxt}>Logout</Text>
        </Pressable>
      </View>

      {/* Date & greeting */}
      <View style={styles.dateBanner}>
        <AppIcon name="today-outline" size={16} color={COLORS.primary} />
        <Text style={styles.dateTxt}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Stats grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading ? (
          <View style={styles.center}><Spinner size="lg" /></View>
        ) : (
          <View style={styles.statsGrid}>
            {STAT_CARDS.map((s, i) => (
              <Card key={i} style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <AppIcon name={s.icon} size={20} color={s.color} />
                </View>
                <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </Card>
            ))}
          </View>
        )}
      </View>

      <Separator style={styles.divider} />

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(manager)/lot/create')}
            accessibilityRole="button"
            accessibilityLabel="Add parking lot"
          >
            <View style={styles.actionIcon}>
              <AppIcon name="add-circle-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionTxt}>Add Lot</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(manager)/(tabs)/scan')}
            accessibilityRole="button"
            accessibilityLabel="Verify ticket"
          >
            <View style={styles.actionIcon}>
              <AppIcon name="qr-code-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.actionTxt}>Verify Ticket</Text>
          </Pressable>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/(manager)/(tabs)/lots')}
            accessibilityRole="button"
            accessibilityLabel="Manage lots"
          >
            <View style={styles.actionIcon}>
              <AppIcon name="business-outline" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.actionTxt}>My Lots</Text>
          </Pressable>
        </View>
      </View>

      <Separator style={styles.divider} />

      {/* Recent activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard}>
          {!recent || recent.length === 0 ? (
            <View style={styles.emptyActivity}>
              <AppIcon name="receipt-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyActivityTxt}>No activity today</Text>
            </View>
          ) : (
            recent.map((b, i) => {
              const lot = b.parking_lots as unknown as { name: string } | null;
              const isActive = b.booking_status === 'active' || b.booking_status === 'confirmed';
              return (
                <View key={b.id}>
                  {i > 0 && <Separator style={styles.activitySep} />}
                  <View style={styles.activityRow}>
                    <View style={[styles.activityDot, {
                      backgroundColor: isActive ? COLORS.success : COLORS.textDisabled,
                    }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityRef}>{b.booking_reference}</Text>
                      <Text style={styles.activityLot}>{lot?.name ?? '—'}</Text>
                    </View>
                    <View style={[styles.activityBadge, {
                      backgroundColor: isActive ? COLORS.successLight : COLORS.secondaryLight,
                    }]}>
                      <Text style={[styles.activityBadgeTxt, {
                        color: isActive ? COLORS.success : COLORS.textMuted,
                      }]}>
                        {b.booking_status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
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
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.errorLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  signOutTxt: { color: COLORS.error, fontSize: 13, fontWeight: '700' },

  dateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.primaryLight, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dateTxt: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  section: { padding: SIZES.lg },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: SIZES.md },
  divider: { marginHorizontal: SIZES.lg },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.md },
  statCard: {
    width: '47%', padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd, gap: SIZES.sm, backgroundColor: COLORS.surface,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '900' },
  statLbl: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  actionsRow: { flexDirection: 'row', gap: SIZES.md },
  actionCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMd,
    padding: SIZES.md, alignItems: 'center', gap: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  actionTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  activityCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md, padding: SIZES.md },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityRef: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  activityLot: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  activityBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activityBadgeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  activitySep: { marginHorizontal: SIZES.md },
  emptyActivity: { alignItems: 'center', justifyContent: 'center', padding: SIZES.xl, gap: SIZES.sm },
  emptyActivityTxt: { color: COLORS.textMuted, fontSize: 14 },
});
