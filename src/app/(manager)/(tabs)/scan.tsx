import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, ScrollView, Modal, Pressable } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, Separator, Spinner } from 'heroui-native';
import { AppIcon } from '../../../components/app-icon';
import { checkInVehicle, checkOutVehicle, verifyBookingQR } from '../../../features/parking/api/managerApi';
import { COLORS, SIZES } from '../../../constants/theme';

type VerifiedBooking = {
  id: string;
  booking_reference: string;
  date: string;
  start_time: string;
  end_time: string;
  booking_status: string;
  profiles?: { full_name?: string };
  vehicles?: { vehicle_number?: string };
  parking_slots?: { slot_number?: string };
  parking_lots?: { name?: string };
};

export default function ManagerScanScreen() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<VerifiedBooking | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);

  const handleVerify = async (scannedToken?: string) => {
    const t = typeof scannedToken === 'string' ? scannedToken : token.trim();
    if (!t) return;
    setLoading(true);
    try {
      const data = await verifyBookingQR(t);
      setBooking(data.booking as VerifiedBooking);
      setShowScanner(false);
    } catch (err) {
      Alert.alert('Verification failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      await checkInVehicle(booking.id);
      Alert.alert('Check-in successful', `Vehicle is now marked as active in slot ${booking.parking_slots?.slot_number ?? ''}.`);
      setBooking(null);
      setToken('');
    } catch (err) {
      Alert.alert('Check-in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      await checkOutVehicle(booking.id);
      Alert.alert('Exit successful', `Vehicle in slot ${booking.parking_slots?.slot_number ?? ''} has exited and the slot is now available.`);
      setBooking(null);
      setToken('');
    } catch (err) {
      Alert.alert('Exit failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBooking(null);
    setToken('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Verify Ticket</Text>
        <Text style={styles.subtitle}>
          Enter the token shown on the customer's parking ticket to verify and check in.
        </Text>
      </View>

      {!booking ? (
        /* ── Token Entry ── */
        <View style={styles.section}>
          <Card style={styles.scanCard}>
            <View style={styles.iconWrap}>
              <View style={styles.iconBg}>
                <AppIcon name="qr-code-outline" size={48} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.cardTitle}>Enter Ticket Token</Text>
            <Text style={styles.cardDesc}>
              Ask the customer to show the token from their parking ticket screen. Type it below to validate.
            </Text>

            <Separator style={styles.sep} />

            <Text style={styles.fieldLbl}>Ticket token</Text>
            <TextInput
              style={styles.tokenInput}
              value={token}
              onChangeText={(t) => setToken(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="PK-XXXXXXXXXXXX"
              placeholderTextColor={COLORS.textMuted}
              autoCorrect={false}
            />

            <Button
              variant="primary"
              isDisabled={!token.trim() || loading}
              onPress={() => handleVerify()}
              style={styles.primaryBtn}
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <View style={styles.btnInner}>
                  <AppIcon name="shield-checkmark-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnTxt}>Verify Ticket</Text>
                </View>
              )}
            </Button>
            
            <Button
              variant="secondary"
              isDisabled={loading}
              onPress={async () => {
                if (!permission?.granted) {
                  const p = await requestPermission();
                  if (!p.granted) {
                    Alert.alert('Permission required', 'We need camera access to scan QR codes.');
                    return;
                  }
                }
                setShowScanner(true);
              }}
              style={styles.secondaryBtn}
            >
              <View style={styles.btnInner}>
                <AppIcon name="camera-outline" size={16} color={COLORS.text} />
                <Text style={styles.secondaryBtnTxt}>Scan QR Code</Text>
              </View>
            </Button>
          </Card>
        </View>
      ) : (
        /* ── Verified ── */
        <View style={styles.section}>
          <Card style={styles.resultCard}>
            {/* Valid badge */}
            <View style={styles.validBadge}>
              <AppIcon 
                name={booking.booking_status === 'active' ? 'car-sport-outline' : 'checkmark-circle'} 
                size={22} 
                color={booking.booking_status === 'active' ? COLORS.primary : COLORS.success} 
              />
              <Text style={[styles.validTxt, { color: booking.booking_status === 'active' ? COLORS.primary : COLORS.success }]}>
                {booking.booking_status === 'active' ? 'Vehicle is currently Parked' : 'Valid Paid Booking'}
              </Text>
            </View>

            <Separator style={styles.sep} />

            {/* Booking details */}
            {[
              { label: 'Customer', value: booking.profiles?.full_name ?? '—', icon: 'person-outline' as const },
              { label: 'Vehicle', value: booking.vehicles?.vehicle_number ?? '—', icon: 'car-outline' as const },
              { label: 'Slot', value: booking.parking_slots?.slot_number ?? '—', icon: 'grid-outline' as const },
              { label: 'Lot', value: booking.parking_lots?.name ?? '—', icon: 'business-outline' as const },
              {
                label: 'Schedule',
                value: `${booking.date} · ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)}`,
                icon: 'calendar-outline' as const,
              },
              { label: 'Reference', value: booking.booking_reference, icon: 'document-text-outline' as const },
            ].map((d, i, arr) => (
              <View key={i}>
                {i > 0 && <Separator style={styles.innerSep} />}
                <View style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <AppIcon name={d.icon} size={15} color={COLORS.textMuted} />
                    <Text style={styles.detailLabel}>{d.label}</Text>
                  </View>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              </View>
            ))}
          </Card>

          {booking.booking_status === 'active' ? (
            <Button
              variant="primary"
              isDisabled={loading}
              onPress={handleCheckOut}
              style={[styles.primaryBtn, { backgroundColor: COLORS.error }]}
            >
              {loading ? (
                <Spinner size="sm" color="white" />
              ) : (
                <View style={styles.btnInner}>
                  <AppIcon name="log-out-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnTxt}>Confirm Exit</Text>
                </View>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              isDisabled={loading || booking.booking_status === 'past'}
              onPress={handleCheckIn}
              style={styles.primaryBtn}
            >
              {loading ? (
                <Spinner size="sm" color="white" />
              ) : (
                <View style={styles.btnInner}>
                  <AppIcon name="log-in-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnTxt}>Confirm Check-In</Text>
                </View>
              )}
            </Button>
          )}

          <Button
            variant="secondary"
            isDisabled={loading}
            onPress={handleReset}
            style={styles.secondaryBtn}
          >
            <View style={styles.btnInner}>
              <AppIcon name="arrow-back-outline" size={16} color={COLORS.text} />
              <Text style={styles.secondaryBtnTxt}>Scan Another</Text>
            </View>
          </Button>
        </View>
      )}

      {/* QR Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scan Ticket</Text>
            <Pressable onPress={() => setShowScanner(false)} style={styles.closeBtn}>
              <AppIcon name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>
          
          <View style={styles.cameraWrap}>
            {showScanner && (
              <CameraView 
                style={StyleSheet.absoluteFill} 
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => {
                  if (data && !loading) {
                    setToken(data);
                    handleVerify(data);
                  }
                }}
              />
            )}
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerTarget} />
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterTxt}>Position the QR code within the frame.</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 100 },

  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.lg,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, lineHeight: 20 },

  section: { padding: SIZES.lg, gap: SIZES.md },

  scanCard: { padding: SIZES.xl, borderWidth: 1, borderColor: COLORS.border, gap: SIZES.md, backgroundColor: COLORS.surface },
  iconWrap: { alignItems: 'center' },
  iconBg: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  cardDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 21 },

  sep: { marginVertical: SIZES.sm },
  innerSep: { marginVertical: SIZES.xs },

  fieldLbl: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  tokenInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: SIZES.md, height: 52,
    color: COLORS.text, fontSize: 16, fontWeight: '700', letterSpacing: 1,
    fontFamily: 'monospace' as any,
  },

  primaryBtn: { height: 52, borderRadius: SIZES.radiusMd },
  primaryBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { height: 52, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  secondaryBtnTxt: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  resultCard: { padding: SIZES.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  validBadge: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  validTxt: { fontSize: 18, fontWeight: '900', color: COLORS.success },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SIZES.sm },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  detailLabel: { fontSize: 14, color: COLORS.textMuted },
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: SIZES.sm },

  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.lg, paddingTop: 60, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  closeBtn: { padding: 4 },
  cameraWrap: { flex: 1, position: 'relative' },
  scannerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scannerTarget: { width: 250, height: 250, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: 'transparent', borderRadius: SIZES.radiusMd },
  modalFooter: { padding: SIZES.lg, backgroundColor: COLORS.surface, alignItems: 'center' },
  modalFooterTxt: { fontSize: 14, color: COLORS.textMuted },
});
