import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Separator, Spinner, Button } from 'heroui-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

export default function AdminLotsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: lots, isLoading, refetch } = useQuery({
    queryKey: ['admin_lots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parking_lots')
        .select('*, parking_managers(business_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('parking_lots')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_lots'] });
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const filteredLots = lots?.filter(lot => filter === 'all' ? true : lot.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking Lots</Text>
        <Text style={styles.subtitle}>Manage all parking facilities</Text>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'inactive'] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTxt, filter === f && styles.filterTxtActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner size="lg" /></View>
      ) : (
        <FlatList
          data={filteredLots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="map-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>No parking lots found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const manager = item.parking_managers as any;
            const isActive = item.status === 'active';

            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.manager}>by {manager?.business_name || 'Unknown'}</Text>
                  </View>
                  <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                    <Text style={[styles.statusTxt, isActive ? styles.statusTxtActive : styles.statusTxtInactive]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <AppIcon name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.statTxt}>{item.city}</Text>
                  </View>
                  <View style={styles.stat}>
                    <AppIcon name="car-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.statTxt}>{item.available_capacity}/{item.total_capacity} free</Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                <View style={styles.actions}>
                  <Button
                    variant="flat"
                    onPress={() => updateStatusMutation.mutate({ id: item.id, status: isActive ? 'inactive' : 'active' })}
                    style={styles.actionBtn}
                  >
                    <Text style={[styles.actionBtnTxt, { color: isActive ? COLORS.error : COLORS.success }]}>
                      {isActive ? 'Deactivate' : 'Activate'}
                    </Text>
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
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  filterRow: {
    flexDirection: 'row', gap: SIZES.sm, paddingHorizontal: SIZES.lg, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTxt: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  filterTxtActive: { color: COLORS.white },

  list: { padding: SIZES.lg, gap: SIZES.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: SIZES.xl, alignItems: 'center', gap: SIZES.sm },
  emptyTxt: { color: COLORS.textMuted, fontSize: 14 },

  card: { padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.md },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  manager: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTxt: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  statusActive: { backgroundColor: COLORS.successLight },
  statusTxtActive: { color: COLORS.success },
  statusInactive: { backgroundColor: COLORS.border },
  statusTxtInactive: { color: COLORS.textMuted },

  sep: { marginVertical: SIZES.sm },
  
  statsRow: { flexDirection: 'row', gap: SIZES.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTxt: { fontSize: 13, color: COLORS.textSecondary },

  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { height: 36, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md },
  actionBtnTxt: { fontSize: 13, fontWeight: '700' },
});
