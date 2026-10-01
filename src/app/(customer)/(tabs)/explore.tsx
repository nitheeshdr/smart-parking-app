import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Spinner, Chip, Card, Separator } from 'heroui-native';
import { fetchParkingLots } from '../../../features/parking/api/parkingApi';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';
import * as Location from 'expo-location';

type FilterKey = 'all' | 'available' | 'low';

export default function CustomerExploreScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [addressLine, setAddressLine] = useState<string>('Locating...');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddressLine('Location permission denied');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({});
        const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          setAddressLine(`${g.name || g.street || g.city}, ${g.city || g.region}`);
        } else {
          setAddressLine('Unknown location');
        }
      } catch (e) {
        setAddressLine('Could not fetch location');
      }
    })();
  }, []);

  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('explore_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_lots' }, () => {
        queryClient.invalidateQueries({ queryKey: ['parking_lots'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, () => {
        queryClient.invalidateQueries({ queryKey: ['parking_lots'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: lots, isLoading, refetch } = useQuery({
    queryKey: ['parking_lots'],
    queryFn: fetchParkingLots,
  });

  const filtered = useMemo(() => {
    if (!lots) return [];
    let res = lots.filter((l) =>
      `${l.name} ${l.address} ${l.city}`.toLowerCase().includes(search.toLowerCase())
    );
    if (filter === 'available') res = res.filter((l) => l.available_capacity > 0);
    if (filter === 'low') res = res.filter((l) => l.available_capacity > 0 && l.available_capacity <= 5);
    return res;
  }, [lots, search, filter]);

  const totalAvailable = lots?.reduce((s, l) => s + l.available_capacity, 0) ?? 0;
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Driver';

  const FILTERS: { label: string; value: FilterKey }[] = [
    { label: 'All Lots', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Almost Full', value: 'low' },
  ];

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: SIZES.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <AppIcon name="location" size={14} color={COLORS.primary} />
            <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: '600' }} numberOfLines={1}>{addressLine}</Text>
          </View>
          <Text style={styles.heroName}>Hey, {firstName}</Text>
        </View>
        <Pressable
          style={styles.avatarBtn}
          onPress={() => router.push('/(customer)/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Text style={styles.avatarLetter}>{firstName.charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      {/* ── Stats bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{lots?.length ?? 0}</Text>
          <Text style={styles.statLbl}>Lots</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{totalAvailable}</Text>
          <Text style={styles.statLbl}>Free Slots</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <AppIcon name="shield-checkmark-outline" size={18} color="#fff" />
          <Text style={styles.statLbl}>Secure Pay</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <AppIcon name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search lots, areas…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <AppIcon name="close-circle" size={18} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filter: ${f.label}`}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Section row ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Parking Lots</Text>
        <Text style={styles.sectionCount}>{filtered.length} found</Text>
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <View style={styles.center}>
          <Spinner size="lg" />
          <Text style={styles.loadingTxt}>Finding lots near you…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="search-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptyText}>Try a different search or clear filters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isFull = item.available_capacity === 0;
            const isLow = !isFull && item.available_capacity <= 5;
            const statusColor = isFull ? COLORS.error : isLow ? COLORS.warning : COLORS.success;
            const statusBg = isFull ? COLORS.errorLight : isLow ? COLORS.warningLight : COLORS.successLight;

            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/(customer)/lot/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`View ${item.name}`}
              >
                <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />
                <View style={styles.cardInner}>
                  {/* Row: name + badge */}
                  <View style={styles.cardRow}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.badge, { backgroundColor: statusBg }]}>
                      <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.badgeTxt, { color: statusColor }]}>
                        {isFull ? 'Full' : `${item.available_capacity} slots`}
                      </Text>
                    </View>
                  </View>

                  {/* Address */}
                  <View style={styles.infoRow}>
                    <AppIcon name="location-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.infoTxt} numberOfLines={1}>
                      {item.address}, {item.city}
                    </Text>
                  </View>

                  <Separator style={styles.sep} />

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.infoRow}>
                      <AppIcon name="time-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.infoTxt}>
                        {item.opening_time.slice(0, 5)} – {item.closing_time.slice(0, 5)}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <AppIcon name="car-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.infoTxt}>{item.total_capacity} spots</Text>
                    </View>
                    <Pressable
                      style={[styles.bookBtn, isFull && styles.bookBtnDisabled]}
                      onPress={() => !isFull && router.push(`/(customer)/lot/${item.id}`)}
                      disabled={isFull}
                      accessibilityRole="button"
                      accessibilityLabel={isFull ? 'Lot full' : `Book ${item.name}`}
                    >
                      <Text style={styles.bookBtnTxt}>{isFull ? 'Full' : 'Book'}</Text>
                      {!isFull && <AppIcon name="arrow-forward" size={12} color="#fff" />}
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { color: COLORS.textMuted, fontSize: 14 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  heroName: { fontSize: 22, fontWeight: '900', color: COLORS.text, letterSpacing: -0.3 },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '900' },

  statsBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.primary, paddingVertical: SIZES.md,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  searchWrap: {
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, backgroundColor: COLORS.surface,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.background, borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md, height: 46,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },

  filterRow: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, gap: SIZES.sm },
  chip: {
    paddingHorizontal: SIZES.md, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#fff' },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, marginTop: SIZES.xs, marginBottom: SIZES.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  list: { paddingHorizontal: SIZES.lg, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardPressed: { opacity: 0.94 },
  cardAccent: { height: 3 },
  cardInner: { padding: SIZES.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardName: { fontSize: 16, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: SIZES.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  infoTxt: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  sep: { marginVertical: SIZES.sm },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    backgroundColor: COLORS.primary, paddingHorizontal: SIZES.sm, paddingVertical: 7,
    borderRadius: 10,
  },
  bookBtnDisabled: { backgroundColor: COLORS.textDisabled },
  bookBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', justifyContent: 'center', padding: SIZES.xl, gap: SIZES.sm },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
