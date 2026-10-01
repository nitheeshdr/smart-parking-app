import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Spinner, Button, Separator } from 'heroui-native';
import * as Location from 'expo-location';
import { fetchParkingLots, ParkingLot } from '../../../features/parking/api/parkingApi';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';
import MapplsGL from 'mappls-map-react-native';

export default function CustomerMapScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<ParkingLot | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (e) {
          console.warn(e);
        }
      }
    })();
  }, []);

  const { data: lots, isLoading: loadingLots } = useQuery({
    queryKey: ['parking_lots'],
    queryFn: fetchParkingLots,
  });

  const totalFree = lots?.reduce((s, l) => s + l.available_capacity, 0) ?? 0;
  
  const centerLat = location ? location.lat : (lots && lots.length > 0 ? lots[0].latitude : 12.9716);
  const centerLng = location ? location.lng : (lots && lots.length > 0 ? lots[0].longitude : 77.5946);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Map View</Text>
          <Text style={styles.subtitle}>
            {lots?.length ?? 0} lots{' '}
            <Text style={{ color: COLORS.success, fontWeight: '700' }}>· {totalFree} free</Text>
          </Text>
        </View>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendTxt}>Free</Text>
          <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendTxt}>Full</Text>
        </View>
      </View>

      <View style={styles.mapWrap}>
        {loadingLots ? (
          <View style={styles.loadingBox}>
            <Spinner color="primary" />
            <Text style={{ marginTop: 10, color: COLORS.textMuted }}>Loading lots...</Text>
          </View>
        ) : (
          <MapplsGL.MapView style={{flex: 1}}>
            <MapplsGL.Camera
              zoomLevel={13}
              centerCoordinate={[centerLng, centerLat]}
            />
            {location && (
               <MapplsGL.PointAnnotation id="user-loc" coordinate={[location.lng, location.lat]}>
                 <View style={styles.userMarker} />
               </MapplsGL.PointAnnotation>
            )}
            
            {lots?.map((lot) => {
              const isFull = lot.available_capacity === 0;
              const color = isFull ? '#DC2626' : '#16A34A';
              
              return (
                <MapplsGL.PointAnnotation 
                  key={lot.id} 
                  id={lot.id} 
                  coordinate={[lot.longitude, lot.latitude]}
                  onSelected={() => setSelected(lot)}
                >
                  <View style={[styles.lotMarker, { backgroundColor: color }]} />
                </MapplsGL.PointAnnotation>
              );
            })}
          </MapplsGL.MapView>
        )}
      </View>

      {selected && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.lotTitle}>{selected.name}</Text>
              <Text style={styles.lotAddress} numberOfLines={1}>{selected.address}, {selected.city}</Text>
            </View>
            <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}>
              <AppIcon name="close" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <Separator style={{ marginVertical: SIZES.md }} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={[styles.statValue, { color: selected.available_capacity > 0 ? COLORS.success : COLORS.error }]}>
                {selected.available_capacity} <Text style={{ fontSize: 12 }}>/ {selected.total_capacity}</Text>
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>₹{(selected as any).hourly_price || 50}/hr</Text>
            </View>
          </View>

          <Button 
            variant="primary"
            onPress={() => {
              const lotId = selected.id;
              setSelected(null);
              router.push(`/(customer)/book/${lotId}`);
            }}
            isDisabled={selected.available_capacity === 0}
          >
            {selected.available_capacity === 0 ? 'Lot Full' : 'Book Slot'}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: SIZES.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginRight: 4 },
  mapWrap: { flex: 1, backgroundColor: '#f0f0f0' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#fff' },
  lotMarker: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SIZES.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lotTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  lotAddress: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, maxWidth: '90%' },
  closeBtn: { padding: 4, backgroundColor: COLORS.background, borderRadius: 16 },
  statsRow: { flexDirection: 'row', gap: SIZES.md },
  statBox: { flex: 1, backgroundColor: COLORS.background, padding: SIZES.md, borderRadius: SIZES.sm },
  statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700' }
});
