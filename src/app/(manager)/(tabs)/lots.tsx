import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { Card, Separator, Spinner, Button } from 'heroui-native';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';

export default function ManagerLotsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: lots, isLoading, refetch } = useQuery({
    queryKey: ['manager_lots', user?.id],
    queryFn: async () => {
      const { data: managerData } = await supabase
        .from('parking_managers')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      if (!managerData) return [];
      const { data, error } = await supabase
        .from('parking_lots')
        .select('*')
        .eq('manager_id', managerData.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Parking Lots</Text>
        <Button
          size="sm"
          variant="primary"
          onPress={() => router.push('/(manager)/lot/create')}
          style={styles.addBtn}
        >
          <View style={styles.addBtnInner}>
            <AppIcon name="add" size={16} color="#fff" />
            <Text style={styles.addBtnTxt}>Add Lot</Text>
          </View>
        </Button>
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner size="lg" /></View>
      ) : (
        <FlatList
          data={lots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="business-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No lots yet</Text>
              <Text style={styles.emptyText}>Add your first parking lot to start accepting bookings.</Text>
              <Pressable
                style={styles.emptyAddBtn}
                onPress={() => router.push('/(manager)/lot/create')}
                accessibilityRole="button"
                accessibilityLabel="Add parking lot"
              >
                <AppIcon name="add-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.emptyAddBtnTxt}>Add Lot</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const isActive = item.status === 'active';
            const occupancy = item.total_capacity > 0
              ? Math.round(((item.total_capacity - item.available_capacity) / item.total_capacity) * 100)
              : 0;

            return (
              <Card style={styles.card}>
                {/* Card header */}
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lotName}>{item.name}</Text>
                    <View style={styles.addressRow}>
                      <AppIcon name="location-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.address}>{item.address}, {item.city}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isActive ? COLORS.successLight : COLORS.border }]}>
                    <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.textMuted }]} />
                    <Text style={[styles.statusTxt, { color: isActive ? COLORS.success : COLORS.textMuted }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <AppIcon name="grid-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.statNum}>{item.total_capacity}</Text>
                    <Text style={styles.statLbl}>Total</Text>
                  </View>
                  <View style={styles.statBox}>
                    <AppIcon name="checkmark-circle-outline" size={16} color={COLORS.success} />
                    <Text style={[styles.statNum, { color: COLORS.success }]}>{item.available_capacity}</Text>
                    <Text style={styles.statLbl}>Free</Text>
                  </View>
                  <View style={styles.statBox}>
                    <AppIcon name="car-outline" size={16} color={COLORS.warning} />
                    <Text style={[styles.statNum, { color: COLORS.warning }]}>
                      {item.total_capacity - item.available_capacity}
                    </Text>
                    <Text style={styles.statLbl}>Occupied</Text>
                  </View>
                  <View style={styles.statBox}>
                    <AppIcon name="bar-chart-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.statNum}>{occupancy}%</Text>
                    <Text style={styles.statLbl}>Full</Text>
                  </View>
                </View>

                {/* Hours */}
                <View style={styles.hoursRow}>
                  <AppIcon name="time-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.hoursTxt}>
                    {item.opening_time?.slice(0, 5)} – {item.closing_time?.slice(0, 5)}
                  </Text>
                </View>

                <Separator style={styles.sep} />

                {/* Actions */}
                <View style={styles.actions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(`/(manager)/lot/edit/${item.id}`)}
                    style={styles.actionBtn}
                  >
                    <View style={styles.actionBtnInner}>
                      <AppIcon name="create-outline" size={14} color={COLORS.text} />
                      <Text style={styles.actionBtnTxt}>Edit Details</Text>
                    </View>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(`/(manager)/lot/${item.id}/slots`)}
                    style={styles.actionBtn}
                  >
                    <View style={styles.actionBtnInner}>
                      <AppIcon name="grid-outline" size={14} color={COLORS.text} />
                      <Text style={styles.actionBtnTxt}>Manage Slots</Text>
                    </View>
                  </Button>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  addBtn: { borderRadius: SIZES.radius },
  addBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  list: { padding: SIZES.lg, gap: SIZES.md, paddingBottom: 100 },
  card: { padding: SIZES.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },

  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm },
  lotName: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  address: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  sep: { marginVertical: SIZES.md },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 4 },
  statNum: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  statLbl: { fontSize: 11, color: COLORS.textMuted },

  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SIZES.sm },
  hoursTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: SIZES.sm },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionBtnTxt: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: SIZES.xl, gap: SIZES.md },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, borderRadius: 20 },
  emptyAddBtnTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
