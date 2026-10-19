import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addVehicle, deleteVehicle, fetchMyBookings, fetchVehicles } from '../../../api/bookings';
import { useAuthStore } from '../../../stores/authStore';
import { AppIcon } from '../../../components/app-icon';
import { Button, Card, Field, Screen, SectionTitle, StatCard, StatGrid } from '../../../components/ui';
import { COLORS, SIZES } from '../../../constants/theme';
import { errorMessage, formatMoney } from '../../../lib/format';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { user, fullName, signOut } = useAuthStore();
  const userId = user?.id ?? '';
  const [plate, setPlate] = useState('');

  const vehicles = useQuery({ queryKey: ['vehicles', userId], queryFn: () => fetchVehicles(userId), enabled: !!userId });
  const bookings = useQuery({ queryKey: ['my_bookings', userId], queryFn: () => fetchMyBookings(userId), enabled: !!userId });

  const add = useMutation({
    mutationFn: () => addVehicle(userId, plate, 'car'),
    onSuccess: () => { setPlate(''); queryClient.invalidateQueries({ queryKey: ['vehicles', userId] }); },
    onError: (e) => Alert.alert('Could not add vehicle', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles', userId] }),
    onError: (e) => Alert.alert('Could not remove vehicle', errorMessage(e, 'This vehicle is used by a booking.')),
  });

  const paid = (bookings.data ?? []).filter((b) => b.payment_status === 'paid');
  const spent = paid.reduce((s, b) => s + Number(b.total_amount), 0);

  return (
    <Screen title="Profile" subtitle={user?.email}>
      <Card style={styles.who}>
        <View style={styles.avatar}><Text style={styles.avatarTxt}>{(fullName || '?').slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.role}>Customer</Text>
        </View>
      </Card>

      <StatGrid>
        <StatCard label="Bookings" value={bookings.data?.length ?? 0} icon="ticket-outline" />
        <StatCard label="Total spent" value={formatMoney(spent)} icon="wallet-outline" color={COLORS.accent} />
      </StatGrid>

      <SectionTitle>My vehicles</SectionTitle>
      {(vehicles.data ?? []).map((v) => (
        <Card key={v.id} style={styles.vehicle}>
          <AppIcon name="car-sport-outline" size={20} color={COLORS.primary} />
          <Text style={styles.plate}>{v.vehicle_number}</Text>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${v.vehicle_number}`}
            onPress={() => Alert.alert('Remove vehicle?', v.vehicle_number, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(v.id) }])}
          >
            <AppIcon name="trash-outline" size={18} color={COLORS.error} />
          </Pressable>
        </Card>
      ))}
      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <Field icon="add-circle-outline" placeholder="Add vehicle, e.g. TN01AB1234" value={plate} onChangeText={(t) => setPlate(t.toUpperCase())} autoCapitalize="characters" />
        </View>
        <Button label="Add" small variant="secondary" disabled={plate.trim().length < 4} loading={add.isPending} onPress={() => add.mutate()} style={{ marginBottom: SIZES.md }} />
      </View>

      <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }])} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  role: { fontSize: 13, color: COLORS.textMuted },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingVertical: SIZES.md, marginBottom: SIZES.sm },
  plate: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, marginTop: SIZES.xs },
});
