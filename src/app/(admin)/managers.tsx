import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Separator, Spinner, Button } from 'heroui-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

export default function AdminManagersScreen() {
  const queryClient = useQueryClient();

  const { data: managers, isLoading, refetch } = useQuery({
    queryKey: ['admin_managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parking_managers')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('parking_managers')
        .update({ verification_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_managers'] });
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Managers</Text>
        <Text style={styles.subtitle}>Approve or reject parking managers</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner size="lg" /></View>
      ) : (
        <FlatList
          data={managers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="business-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>No managers found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const profile = item.profiles as any;
            const isApproved = item.verification_status === 'approved';
            const isRejected = item.verification_status === 'rejected';
            const isPending = item.verification_status === 'pending';

            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <AppIcon name="business-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.business_name}</Text>
                    <Text style={styles.owner}>Owner: {profile?.full_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, isApproved ? styles.statusApproved : isRejected ? styles.statusRejected : styles.statusPending]}>
                    <Text style={[styles.statusTxt, isApproved ? styles.statusTxtApproved : isRejected ? styles.statusTxtRejected : styles.statusTxtPending]}>
                      {item.verification_status}
                    </Text>
                  </View>
                </View>

                <Separator style={styles.sep} />

                <View style={styles.contactRow}>
                  <View style={styles.contactItem}>
                    <AppIcon name="mail-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.contactTxt}>{profile?.email}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <AppIcon name="call-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.contactTxt}>{item.business_phone || 'N/A'}</Text>
                  </View>
                </View>

                {isPending && (
                  <>
                    <Separator style={styles.sep} />
                    <View style={styles.actions}>
                      <Button
                        variant="secondary"
                        onPress={() => updateStatusMutation.mutate({ id: item.id, status: 'rejected' })}
                        style={[styles.actionBtn, { borderColor: COLORS.error }]}
                      >
                         <Text style={[styles.actionBtnTxt, { color: COLORS.error }]}>Reject</Text>
                      </Button>
                      <View style={{ width: SIZES.sm }} />
                      <Button
                        variant="primary"
                        onPress={() => updateStatusMutation.mutate({ id: item.id, status: 'approved' })}
                        style={styles.actionBtn}
                      >
                        <Text style={[styles.actionBtnTxt, { color: COLORS.white }]}>Approve</Text>
                      </Button>
                    </View>
                  </>
                )}
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
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  owner: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTxt: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  statusApproved: { backgroundColor: COLORS.successLight },
  statusTxtApproved: { color: COLORS.success },
  statusRejected: { backgroundColor: COLORS.errorLight },
  statusTxtRejected: { color: COLORS.error },
  statusPending: { backgroundColor: COLORS.warningLight },
  statusTxtPending: { color: COLORS.warning },

  sep: { marginVertical: SIZES.sm },
  
  contactRow: { gap: SIZES.xs },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactTxt: { fontSize: 13, color: COLORS.textSecondary },

  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { flex: 1, height: 36, borderRadius: SIZES.radiusSm },
  actionBtnTxt: { fontSize: 13, fontWeight: '700' },
});
