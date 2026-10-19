import React, { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveLots } from '../../../api/lots';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';
import { useAuthStore } from '../../../stores/authStore';
import { EmptyState, ErrorState, Field, Loading, LiveDot, Screen, Segmented } from '../../../components/ui';
import { LotCard } from '../../../components/lot-card';
import { COLORS } from '../../../constants/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const fullName = useAuthStore((s) => s.fullName);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'free'>('all');

  useRealtimeSync('customer_explore', ['parking_lots', 'parking_slots'], [['lots']]);
  const { data: lots, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ['lots'], queryFn: fetchActiveLots });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lots ?? []).filter((l) => (filter === 'free' ? l.available_capacity > 0 : true) && (!q || `${l.name} ${l.address} ${l.city}`.toLowerCase().includes(q)));
  }, [lots, search, filter]);

  const totalFree = (lots ?? []).reduce((s, l) => s + l.available_capacity, 0);

  return (
    <Screen
      title={`Hi, ${fullName.split(' ')[0] || 'there'}`}
      subtitle={lots ? `${totalFree} free slots across ${lots.length} lot${lots.length === 1 ? '' : 's'}` : 'Finding parking near you'}
      right={<LiveDot />}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <Field icon="search-outline" placeholder="Search lots, areas, cities" value={search} onChangeText={setSearch} />
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All lots' }, { value: 'free', label: 'Has free slots' }]} />

      {isLoading ? (
        <Loading label="Loading parking lots…" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="car-outline" title="No lots found" hint={search ? 'Try a different search.' : 'No parking lots are open right now.'} />
      ) : (
        filtered.map((lot) => <LotCard key={lot.id} lot={lot} onPress={() => router.push(`/(customer)/lot/${lot.id}`)} />)
      )}
      <Text style={styles.foot}>Availability updates live from the lot sensors.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  foot: { textAlign: 'center', color: COLORS.textDisabled, fontSize: 12, marginTop: 8 },
});
