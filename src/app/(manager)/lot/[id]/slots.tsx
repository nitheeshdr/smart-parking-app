import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from 'heroui-native';
import { supabase } from '../../../../lib/supabase';
import { COLORS, SIZES } from '../../../../constants/theme';

export default function ManageSlotsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: slots, isLoading } = useQuery({
    queryKey: ['lot_slots', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('parking_lot_id', id)
        .order('slot_number');
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const handleAddSlot = async () => {
    setAdding(true);
    try {
      const newSlotNumber = `S-${String((slots?.length || 0) + 1).padStart(3, '0')}`;
      const { error } = await supabase
        .from('parking_slots')
        .insert({
          parking_lot_id: id,
          slot_number: newSlotNumber,
          slot_type: 'regular',
          vehicle_type: 'car',
          floor: '1',
          hourly_price: 50.00,
          status: 'available'
        });
        
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['lot_slots', id] });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase.from('parking_slots').delete().eq('id', slotId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['lot_slots', id] });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    const slot = slots?.find((item) => item.id === slotId);
    if (slot?.status === 'occupied') {
      Alert.alert('Cannot delete slot', 'Check out the active vehicle before deleting this slot.');
      return;
    }
    Alert.alert('Delete slot?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteSlot(slotId) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Button variant="secondary" size="sm" onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{color: COLORS.text, fontWeight: 'bold'}}>Back</Text>
          </Button>
          <Text style={styles.title}>Manage Slots</Text>
        </View>
        <Button size="sm" variant="primary" onPress={handleAddSlot} isDisabled={adding}>
          <Text style={{color: COLORS.surface, fontWeight: 'bold'}}>{adding ? '...' : '+ Add Slot'}</Text>
        </Button>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>
      ) : (
        <FlatList
          data={slots}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{color: COLORS.textMuted}}>No slots created yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotNumber}>{item.slot_number}</Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'available' ? COLORS.primaryLight : COLORS.border }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'available' ? COLORS.primary : COLORS.textMuted }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.price}>₹{item.hourly_price}/hr</Text>
              
              <Button size="sm" variant="danger" style={styles.deleteBtn} onPress={() => handleDeleteSlot(item.id)}>
                <Text style={{color: COLORS.error, fontSize: 12}}>Delete</Text>
              </Button>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingTop: 60,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SIZES.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  list: {
    padding: SIZES.lg,
  },
  row: {
    justifyContent: 'space-between',
  },
  slotCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  slotNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SIZES.md,
  },
  deleteBtn: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 0,
  }
});
