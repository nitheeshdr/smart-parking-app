import React, { useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkInBooking, checkOutBooking, verifyTicket } from '../../api/bookings';
import { Badge, Button, Card, Field, Row, Screen } from '../../components/ui';
import { BOOKING_TONE } from '../../components/ui/status';
import { COLORS, SIZES } from '../../constants/theme';
import { errorMessage, formatDate, formatTime } from '../../lib/format';
import type { TicketInfo } from '../../types/db';

export default function ScanScreen() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScan = useRef('');

  const reset = () => { setTicket(null); setToken(''); lastScan.current = ''; };

  const verify = useMutation({
    mutationFn: (t: string) => verifyTicket(t),
    onSuccess: (t) => { setTicket(t); setScanning(false); },
    onError: (e) => { setScanning(false); lastScan.current = ''; Alert.alert('Ticket not valid', errorMessage(e)); },
  });
  const act = useMutation({
    mutationFn: (v: { kind: 'in' | 'out'; id: string }) => (v.kind === 'in' ? checkInBooking(v.id) : checkOutBooking(v.id)),
    onSuccess: (_r, v) => {
      queryClient.invalidateQueries({ queryKey: ['staff_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['all_bookings'] });
      Alert.alert(v.kind === 'in' ? 'Checked in' : 'Checked out', `Slot ${ticket?.slot_number} · ${ticket?.vehicle_number}`);
      reset();
    },
    onError: (e) => Alert.alert('Action failed', errorMessage(e)),
  });

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return Alert.alert('Camera access needed', 'Allow camera access to scan tickets, or type the token instead.');
    }
    setScanning(true);
  };

  return (
    <Screen title="Verify ticket" subtitle="Scan the customer QR code or type the token">
      {!ticket ? (
        <Card>
          <Button label="Scan QR code" icon="qr-code-outline" onPress={openScanner} />
          <Text style={styles.or}>or enter the token</Text>
          <Field label="Ticket token / reference" icon="keypad-outline" placeholder="PK-XXXXXXXXXXXX" value={token} onChangeText={(t) => setToken(t.toUpperCase())} autoCapitalize="characters" />
          <Button label="Verify" variant="secondary" disabled={!token.trim()} loading={verify.isPending} onPress={() => verify.mutate(token.trim())} />
        </Card>
      ) : (
        <Card>
          <View style={styles.head}>
            <Text style={styles.name}>{ticket.customer_name}</Text>
            <Badge tone={BOOKING_TONE[ticket.booking_status]} />
          </View>
          <Row icon="location-outline" label="Lot" value={ticket.lot_name} />
          <Row icon="grid-outline" label="Slot" value={ticket.slot_number} />
          <Row icon="car-outline" label="Vehicle" value={ticket.vehicle_number} />
          <Row icon="calendar-outline" label="Date" value={formatDate(ticket.date)} />
          <Row icon="time-outline" label="Time" value={`${formatTime(ticket.start_time)} – ${formatTime(ticket.end_time)}`} />
          <Row icon="document-text-outline" label="Reference" value={ticket.booking_reference} />

          <View style={{ height: SIZES.md }} />
          {ticket.booking_status === 'confirmed' && ticket.payment_status === 'paid' ? (
            <Button label="Check in vehicle" icon="log-in-outline" loading={act.isPending} onPress={() => act.mutate({ kind: 'in', id: ticket.id })} />
          ) : ticket.booking_status === 'active' ? (
            <Button label="Check out vehicle" icon="log-out-outline" loading={act.isPending} onPress={() => act.mutate({ kind: 'out', id: ticket.id })} />
          ) : (
            <Text style={styles.invalid}>This ticket cannot be used ({BOOKING_TONE[ticket.booking_status].label.toLowerCase()}).</Text>
          )}
          <Button label="Scan another" variant="ghost" onPress={reset} style={{ marginTop: SIZES.sm }} />
        </Card>
      )}

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={styles.scanner}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (!data || data === lastScan.current || verify.isPending) return;
              lastScan.current = data;
              verify.mutate(data);
            }}
          />
          <View style={styles.frame} />
          <View style={styles.close}>
            <Button label="Cancel" variant="secondary" onPress={() => { setScanning(false); lastScan.current = ''; }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  or: { textAlign: 'center', color: COLORS.textMuted, marginVertical: SIZES.md, fontSize: 13 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.text, flex: 1 },
  invalid: { textAlign: 'center', color: COLORS.error, fontWeight: '700' },
  scanner: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: '#fff' },
  close: { position: 'absolute', bottom: 48, left: 24, right: 24 },
});
