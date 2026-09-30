import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Separator, Spinner } from 'heroui-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

export default function AdminBookingsScreen() {
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['admin_all_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles(full_name), parking_lots(name), vehicles(vehicle_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const STATUS_COLOR: Record<string, { bg: string, text: string }> = {
    confirmed: { bg: COLORS.successLight, text: COLORS.success },
    active: { bg: COLORS.primaryLight, text: COLORS.primary },
    completed: { bg: COLORS.surfaceHover, text: COLORS.textMuted },
    pending: { bg: COLORS.warningLight, text: COLORS.warning },
    cancelled: { bg: COLORS.errorLight, text: COLORS.error },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Bookings</Text>
        <Text style={styles.subtitle}>System-wide reservation history</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner size="lg" /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>No bookings found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const profile = item.profiles as any;
            const lot = item.parking_lots as any;
            const vehicle = item.vehicles as any;
            const sColor = STATUS_COLOR[item.booking_status] || STATUS_COLOR.completed;

            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ref}>{item.booking_reference}</Text>
                    <Text style={styles.user}>{profile?.full_name || 'Unknown User'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sColor.bg }]}>
                    <Text style={[styles.statusTxt, { color: sColor.text }]}>
                      {item.booking_status}
                    </Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                <View style={styles.detailsGrid}>
                  <View style={styles.detail}>
                    <AppIcon name="business-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>{lot?.name}</Text>
                  </View>
                  <View style={styles.detail}>
                    <AppIcon name="car-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>{vehicle?.vehicle_number}</Text>
                  </View>
                  <View style={styles.detail}>
                    <AppIcon name="calendar-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>{item.date}</Text>
                  </View>
                  <View style={styles.detail}>
                    <AppIcon name="time-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailTxt}>{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                <View style={styles.footerRow}>
                  <Text style={styles.paymentTxt}>
                    Payment: <Text style={{ color: item.payment_status === 'paid' ? COLORS.success : COLORS.warning }}>{item.payment_status}</Text>
                  </Text>
                  <Text style={styles.amount}>₹{item.total_amount}</Text>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  list: { padding: SIZES.lg, gap: SIZES.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: SIZES.xl, alignItems: 'center', gap: SIZES.sm },
  emptyTxt: { color: COLORS.textMuted, fontSize: 14 },

  card: { padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.md },
  ref: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  user: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTxt: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },

  sep: { marginVertical: SIZES.sm },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  detail: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailTxt: { fontSize: 13, color: COLORS.textSecondary },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'capitalize' },
  amount: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
});
