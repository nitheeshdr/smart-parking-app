import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Spinner, Chip, Separator, Avatar } from 'heroui-native';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { AppIcon } from '../../../components/app-icon';
import { COLORS, SIZES } from '../../../constants/theme';

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_color: string;
}

type VehicleType = 'car' | 'bike' | 'suv' | 'ev';

const VEHICLE_TYPES: { label: string; value: VehicleType; icon: 'car-outline' | 'bicycle-outline' | 'car-sport-outline' | 'flash-outline' }[] = [
  { label: 'Car', value: 'car', icon: 'car-outline' },
  { label: 'Bike', value: 'bike', icon: 'bicycle-outline' },
  { label: 'SUV', value: 'suv', icon: 'car-sport-outline' },
  { label: 'EV', value: 'ev', icon: 'flash-outline' },
];

export default function CustomerProfileScreen() {
  const { user, signOut } = useAuthStore();
  const queryClient = useQueryClient();
  const meta = user?.user_metadata || {};

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleNum, setVehicleNum] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [saving, setSaving] = useState(false);

  /* ── Queries ── */
  const { data: vehicles, isLoading: vLoading } = useQuery<Vehicle[]>({
    queryKey: ['my_vehicles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['my_booking_stats', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('booking_status, total_amount')
        .eq('customer_id', user?.id);
      const total = data?.length ?? 0;
      const completed = data?.filter((b) => b.booking_status === 'completed').length ?? 0;
      const spent = data?.reduce((s, b) => s + Number(b.total_amount), 0) ?? 0;
      return { total, completed, spent };
    },
    enabled: !!user?.id,
  });

  /* ── Actions ── */
  const handleAddVehicle = async () => {
    if (!vehicleNum.trim()) {
      Alert.alert('Required', 'Enter a vehicle registration number.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('vehicles').insert({
        user_id: user?.id,
        vehicle_number: vehicleNum.trim().toUpperCase(),
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel.trim() || null,
        vehicle_color: vehicleColor.trim() || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['my_vehicles', user?.id] });
      setShowAddVehicle(false);
      setVehicleNum('');
      setVehicleModel('');
      setVehicleColor('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = (id: string) => {
    Alert.alert('Remove Vehicle?', 'This will remove the vehicle from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await supabase.from('vehicles').delete().eq('id', id);
          queryClient.invalidateQueries({ queryKey: ['my_vehicles', user?.id] });
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Avatar
            size="xl"
            fallback={meta.full_name?.charAt(0)?.toUpperCase() || 'D'}
            style={styles.avatar}
          />
          <Text style={styles.heroName}>{meta.full_name || 'Driver'}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={styles.verifiedRow}>
            <AppIcon name="shield-checkmark-outline" size={14} color={COLORS.primary} />
            <Text style={styles.verifiedTxt}>Verified Customer</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats?.total ?? 0}</Text>
              <Text style={styles.statLbl}>Bookings</Text>
            </View>
            <Separator orientation="vertical" style={styles.vSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats?.completed ?? 0}</Text>
              <Text style={styles.statLbl}>Completed</Text>
            </View>
            <Separator orientation="vertical" style={styles.vSep} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: COLORS.success }]}>
                {'\u20B9'}{stats?.spent ?? 0}
              </Text>
              <Text style={styles.statLbl}>Spent</Text>
            </View>
          </View>
        </Card>

        {/* ── Vehicles ── */}
        <Card style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>My Vehicles</Text>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => setShowAddVehicle(true)}
              style={styles.addBtn}
            >
              <View style={styles.addBtnInner}>
                <AppIcon name="add-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.addBtnTxt}>Add</Text>
              </View>
            </Button>
          </View>

          <Separator style={styles.sep} />

          {vLoading ? (
            <View style={styles.center}><Spinner /></View>
          ) : vehicles?.length === 0 ? (
            <View style={styles.emptyState}>
              <AppIcon name="car-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>No vehicles added yet</Text>
              <Button size="sm" variant="flat" onPress={() => setShowAddVehicle(true)} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnTxt}>Add your first vehicle</Text>
              </Button>
            </View>
          ) : (
            vehicles?.map((v, i) => {
              const iconName = v.vehicle_type === 'bike'
                ? 'bicycle-outline'
                : v.vehicle_type === 'ev'
                ? 'flash-outline'
                : v.vehicle_type === 'suv'
                ? 'car-sport-outline'
                : 'car-outline';
              return (
                <View key={v.id}>
                  {i > 0 && <Separator style={styles.sep} />}
                  <View style={styles.vehicleRow}>
                    <View style={styles.vehicleIconWrap}>
                      <AppIcon name={iconName} size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleNum}>{v.vehicle_number}</Text>
                      <Text style={styles.vehicleInfo}>
                        {[v.vehicle_model, v.vehicle_color, v.vehicle_type].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteVehicle(v.id)}
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove vehicle"
                    >
                      <AppIcon name="trash-outline" size={18} color={COLORS.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* ── Account Info ── */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Separator style={styles.sep} />
          {[
            { icon: 'mail-outline' as const, label: 'Email', value: user?.email },
            { icon: 'person-outline' as const, label: 'Full Name', value: meta.full_name },
            { icon: 'calendar-outline' as const, label: 'Member Since', value: user?.created_at?.slice(0, 10) },
          ].map((row, i, arr) => (
            <View key={i}>
              <View style={styles.accountRow}>
                <AppIcon name={row.icon} size={18} color={COLORS.textMuted} />
                <View style={{ flex: 1, marginLeft: SIZES.sm }}>
                  <Text style={styles.accountLabel}>{row.label}</Text>
                  <Text style={styles.accountValue}>{row.value ?? '—'}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <Separator style={styles.sep} />}
            </View>
          ))}
        </Card>

        {/* ── Sign Out ── */}
        <Button
          variant="flat"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        >
          <View style={styles.signOutInner}>
            <AppIcon name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.signOutTxt}>Sign Out</Text>
          </View>
        </Button>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Vehicle Modal ── */}
      <Modal visible={showAddVehicle} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            <Pressable onPress={() => setShowAddVehicle(false)} accessibilityRole="button" accessibilityLabel="Close">
              <AppIcon name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.fieldLbl}>Registration Number *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. TN 01 AB 1234"
              value={vehicleNum}
              onChangeText={setVehicleNum}
              autoCapitalize="characters"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLbl}>Vehicle Type</Text>
            <View style={styles.typeRow}>
              {VEHICLE_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  style={[styles.typeChip, vehicleType === t.value && styles.typeChipActive]}
                  onPress={() => setVehicleType(t.value)}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                >
                  <AppIcon
                    name={t.icon}
                    size={16}
                    color={vehicleType === t.value ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[styles.typeChipTxt, vehicleType === t.value && styles.typeChipTxtActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLbl}>Model (Optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Honda City"
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLbl}>Color (Optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. White"
              value={vehicleColor}
              onChangeText={setVehicleColor}
              placeholderTextColor={COLORS.textMuted}
            />

            <Button
              variant="primary"
              onPress={handleAddVehicle}
              isDisabled={saving || !vehicleNum.trim()}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnTxt}>{saving ? 'Saving…' : 'Save Vehicle'}</Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { padding: SIZES.xl, justifyContent: 'center', alignItems: 'center' },

  hero: {
    alignItems: 'center', paddingTop: 56, paddingBottom: SIZES.xl,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatar: { marginBottom: SIZES.md },
  heroName: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  heroEmail: { fontSize: 14, color: COLORS.textMuted, marginBottom: SIZES.sm },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  verifiedTxt: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  statsCard: { marginHorizontal: SIZES.lg, marginTop: SIZES.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: SIZES.lg },
  statNum: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  statLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  vSep: { height: 40, width: 1 },

  section: { marginHorizontal: SIZES.lg, marginTop: SIZES.md, padding: SIZES.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  addBtn: { paddingHorizontal: 0 },
  addBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  sep: { marginVertical: SIZES.md },

  emptyState: { alignItems: 'center', paddingVertical: SIZES.lg, gap: SIZES.sm },
  emptyTxt: { fontSize: 14, color: COLORS.textMuted },
  emptyBtn: { marginTop: 4 },
  emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  vehicleIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  vehicleNum: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  vehicleInfo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn: { padding: 8 },

  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountLabel: { fontSize: 12, color: COLORS.textMuted },
  accountValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },

  signOutBtn: { marginHorizontal: SIZES.lg, marginTop: SIZES.lg, backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: COLORS.error + '30', borderRadius: SIZES.radiusMd },
  signOutInner: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, justifyContent: 'center' },
  signOutTxt: { color: COLORS.error, fontSize: 15, fontWeight: '700' },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, paddingTop: 20, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalBody: { padding: SIZES.lg, gap: SIZES.xs },
  fieldLbl: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: SIZES.md, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, padding: SIZES.md, color: COLORS.text, fontSize: 15,
  },
  typeRow: { flexDirection: 'row', gap: SIZES.sm, flexWrap: 'wrap' },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SIZES.md, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeChipTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  typeChipTxtActive: { color: COLORS.primary },
  saveBtn: { marginTop: SIZES.xl, height: 52, borderRadius: SIZES.radiusMd },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
