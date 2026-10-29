import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import MapplsGL from 'mappls-map-react-native';
import { fetchActiveLots } from '../../../api/lots';
import { AppIcon } from '../../../components/app-icon';
import { Button, Loading, Screen } from '../../../components/ui';
import { lotTone } from '../../../components/lot-card';
import { COLORS, SIZES } from '../../../constants/theme';
import type { ParkingLot } from '../../../types/db';

export default function MapScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // location is optional
      }
    })();
  }, []);

  const { data: lots, isLoading } = useQuery({ queryKey: ['lots'], queryFn: fetchActiveLots });

  // Always read the selected lot from live data so the sheet updates when a sensor changes.
  const selected: ParkingLot | undefined = lots?.find((l) => l.id === selectedId);
  const first = lots?.[0];
  const center: [number, number] = me ? [me.lng, me.lat] : first ? [first.longitude, first.latitude] : [80.2707, 13.0827];
  const totalFree = (lots ?? []).reduce((s, l) => s + l.available_capacity, 0);

  return (
    <Screen title="Map" subtitle={`${lots?.length ?? 0} lots · ${totalFree} free`} scroll={false} padded={false}>
      {isLoading ? (
        <Loading label="Loading map…" />
      ) : (
        <View style={{ flex: 1 }}>
          <MapplsGL.MapView style={{ flex: 1 }}>
            <MapplsGL.Camera zoomLevel={14} centerCoordinate={center} />
            {me ? (
              <MapplsGL.PointAnnotation id="me" coordinate={[me.lng, me.lat]}>
                <View style={styles.me} />
              </MapplsGL.PointAnnotation>
            ) : null}
            {(lots ?? []).map((lot) => (
              <MapplsGL.PointAnnotation key={`${lot.id}-${lot.available_capacity}`} id={lot.id} coordinate={[lot.longitude, lot.latitude]} onSelected={() => setSelectedId(lot.id)}>
                <View style={[styles.pin, { backgroundColor: lotTone(lot).fg }]}>
                  <Text style={styles.pinTxt}>{lot.available_capacity}</Text>
                </View>
              </MapplsGL.PointAnnotation>
            ))}
          </MapplsGL.MapView>

          {selected ? (
            <View style={styles.sheet}>
              <View style={styles.sheetTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{selected.name}</Text>
                  <Text style={styles.addr} numberOfLines={1}>{selected.address}, {selected.city}</Text>
                </View>
                <Pressable onPress={() => setSelectedId(null)} hitSlop={10} accessibilityLabel="Close" accessibilityRole="button">
                  <AppIcon name="close" size={22} color={COLORS.text} />
                </Pressable>
              </View>
              <Text style={[styles.free, { color: lotTone(selected).fg }]}>{selected.available_capacity} of {selected.total_capacity} slots free</Text>
              <View style={{ flexDirection: 'row', gap: SIZES.sm }}>
                <Button label="Details" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/(customer)/lot/${selected.id}`)} />
                <Button label="Book" style={{ flex: 1 }} disabled={selected.available_capacity === 0} onPress={() => router.push(`/(customer)/book/${selected.id}`)} />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  me: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, borderWidth: 3, borderColor: '#fff' },
  pin: { minWidth: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', paddingHorizontal: 6 },
  pinTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface, padding: SIZES.lg, gap: SIZES.sm,
    borderTopLeftRadius: SIZES.radiusXl, borderTopRightRadius: SIZES.radiusXl, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
  },
  sheetTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  addr: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  free: { fontSize: 15, fontWeight: '800', marginVertical: 4 },
});
