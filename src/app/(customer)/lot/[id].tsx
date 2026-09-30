import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, Spinner, Separator, Button, Chip } from 'heroui-native';
import { fetchParkingLotById, fetchParkingSlots } from '../../../features/parking/api/parkingApi';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';

type SlotType = 'regular' | 'disabled' | 'ev' | 'premium' | 'reserved';
const SLOT_ICON: Record<SlotType, string> = {
  regular: 'car-outline',
  disabled: 'accessibility-outline',
  ev: 'flash-outline',
  premium: 'star-outline',
  reserved: 'lock-closed-outline',
};

export default function ParkingLotDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => fetchParkingLotById(id),
  });

  const { data: slots } = useQuery({
    queryKey: ['slots', id],
    queryFn: () => fetchParkingSlots(id),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Spinner size="lg" />
      </View>
    );
  }

  if (!lot) {
    return (
      <View style={styles.center}>
        <AppIcon name="alert-circle-outline" size={40} color={COLORS.error} />
        <Text style={styles.errorTxt}>Lot not found.</Text>
      </View>
    );
  }

  const available = slots?.filter((s) => s.status === 'available').length ?? 0;
  const occupied = slots?.filter((s) => s.status === 'occupied').length ?? 0;
  const isFull = available === 0;
  const minPrice = slots?.length ? Math.min(...slots.map((s) => Number(s.hourly_price))) : 50;

  // Group slots by type
  const slotTypes = slots?.reduce<Record<string, number>>((acc, s) => {
    acc[s.slot_type] = (acc[s.slot_type] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero banner */}
        <View style={styles.hero}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="chevron-back" size={22} color={COLORS.text} />
          </Pressable>

          <View style={styles.heroIconWrap}>
            <AppIcon name="business-outline" size={52} color={COLORS.primary} />
          </View>
          <Text style={styles.heroLabel}>Parking Facility</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Name & address */}
          <Text style={styles.lotName}>{lot.name}</Text>
          <View style={styles.addressRow}>
            <AppIcon name="location-outline" size={15} color={COLORS.textMuted} />
            <Text style={styles.address}>{lot.address}, {lot.city} – {lot.pincode}</Text>
          </View>

          {/* Status chips */}
          <View style={styles.chipsRow}>
            <View style={[styles.chip, {
              backgroundColor: isFull ? COLORS.errorLight : COLORS.successLight,
            }]}>
              <View style={[styles.chipDot, {
                backgroundColor: isFull ? COLORS.error : COLORS.success,
              }]} />
              <Text style={[styles.chipTxt, {
                color: isFull ? COLORS.error : COLORS.success,
              }]}>
                {isFull ? 'Full' : `${available} slots free`}
              </Text>
            </View>
            <View style={styles.chip}>
              <AppIcon name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.chipTxtMuted}>
                {lot.opening_time.slice(0, 5)} – {lot.closing_time.slice(0, 5)}
              </Text>
            </View>
            <View style={styles.chip}>
              <AppIcon name="car-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.chipTxtMuted}>{lot.total_capacity} spots</Text>
            </View>
          </View>

          <Separator style={styles.sep} />

          {/* Stats row */}
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.success }]}>{available}</Text>
                <Text style={styles.statLbl}>Available</Text>
              </View>
              <Separator orientation="vertical" style={{ height: 40 }} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: COLORS.error }]}>{occupied}</Text>
                <Text style={styles.statLbl}>Occupied</Text>
              </View>
              <Separator orientation="vertical" style={{ height: 40 }} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{lot.total_capacity}</Text>
                <Text style={styles.statLbl}>Total</Text>
              </View>
            </View>
          </Card>

          {/* Slot types */}
          {Object.keys(slotTypes).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Slot Types</Text>
              <View style={styles.slotTypeRow}>
                {Object.entries(slotTypes).map(([type, count]) => (
                  <View key={type} style={styles.slotTypeChip}>
                    <AppIcon
                      name={SLOT_ICON[type as SlotType] as never ?? 'car-outline'}
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.slotTypeTxt}>{count} {type}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* About */}
          <Text style={styles.sectionTitle}>About</Text>
          <Card style={styles.aboutCard}>
            <Text style={styles.aboutTxt}>
              {lot.description ||
                `${lot.name} is a well-maintained parking facility in ${lot.city}. Open daily from ${lot.opening_time.slice(0, 5)} to ${lot.closing_time.slice(0, 5)}.`}
            </Text>
          </Card>

          {/* Location */}
          <Text style={styles.sectionTitle}>Location</Text>
          <Card style={styles.locationCard}>
            <View style={styles.locationRow}>
              <AppIcon name="location" size={18} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationAddress}>{lot.address}</Text>
                <Text style={styles.locationCity}>{lot.city}, {lot.pincode}</Text>
              </View>
            </View>
            <Separator style={styles.sep} />
            <View style={styles.coordsRow}>
              <AppIcon name="navigate-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.coordsTxt}>
                {lot.latitude.toFixed(5)}, {lot.longitude.toFixed(5)}
              </Text>
            </View>
          </Card>

          {/* Cancellation */}
          <Text style={styles.sectionTitle}>Cancellation Policy</Text>
          <Card style={styles.aboutCard}>
            <View style={styles.policyRow}>
              <AppIcon name="information-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.aboutTxt}>
                Free cancellation up to 1 hour before the scheduled start time. After that, a 50% fee applies.
              </Text>
            </View>
          </Card>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.priceFrom}>from</Text>
          <Text style={styles.price}>
            {'\u20B9'}{minPrice}
            <Text style={styles.pricePer}>/hr</Text>
          </Text>
        </View>
        <Button
          variant="primary"
          onPress={() => router.push(`/(customer)/book/${lot.id}`)}
          isDisabled={isFull}
          style={styles.bookBtn}
        >
          <View style={styles.bookBtnInner}>
            <AppIcon name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.bookBtnTxt}>{isFull ? 'Lot Full' : 'Select a Slot'}</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorTxt: { fontSize: 16, color: COLORS.error },

  hero: {
    height: 240, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  heroIconWrap: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  heroLabel: { marginTop: SIZES.sm, fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  backBtn: {
    position: 'absolute', top: 52, left: SIZES.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },

  content: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl, marginTop: -SIZES.xl, padding: SIZES.lg,
  },
  lotName: { fontSize: 26, fontWeight: '900', color: COLORS.text, marginBottom: 6, letterSpacing: -0.5 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SIZES.md },
  address: { fontSize: 14, color: COLORS.textMuted, flex: 1, lineHeight: 20 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTxt: { fontSize: 12, fontWeight: '700' },
  chipTxtMuted: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  sep: { marginVertical: SIZES.md },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: SIZES.sm, marginTop: SIZES.md },

  statsCard: { borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: SIZES.md },
  stat: { alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  statLbl: { fontSize: 12, color: COLORS.textMuted },

  slotTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.sm },
  slotTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  slotTypeTxt: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },

  aboutCard: { padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.sm },
  aboutTxt: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22, flex: 1 },
  policyRow: { flexDirection: 'row', gap: SIZES.sm, alignItems: 'flex-start' },

  locationCard: { padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SIZES.sm },
  locationRow: { flexDirection: 'row', gap: SIZES.md, alignItems: 'center' },
  locationAddress: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  locationCity: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordsTxt: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'monospace' as any },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingBottom: Platform.OS === 'ios' ? SIZES.xxl : SIZES.lg,
    paddingTop: SIZES.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  priceFrom: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  price: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  pricePer: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  bookBtn: { height: 52, borderRadius: SIZES.radiusMd, paddingHorizontal: SIZES.lg },
  bookBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
