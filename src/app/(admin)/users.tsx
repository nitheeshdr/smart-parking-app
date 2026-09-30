import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Separator, Spinner } from 'heroui-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

export default function AdminUsersScreen() {
  const [search, setSearch] = React.useState('');

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, avatar_url')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = users?.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>Manage all registered accounts</Text>
      </View>

      <View style={styles.searchWrap}>
        <AppIcon name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><Spinner size="lg" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="people-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>No users found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitials}>
                    {item.full_name?.slice(0, 2).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.full_name || 'No Name'}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <View style={[styles.roleBadge, item.role === 'admin' ? styles.roleAdmin : item.role === 'parking_manager' ? styles.roleManager : styles.roleCustomer]}>
                  <Text style={[styles.roleTxt, item.role === 'admin' ? styles.roleTxtAdmin : item.role === 'parking_manager' ? styles.roleTxtManager : styles.roleTxtCustomer]}>
                    {item.role.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Separator style={styles.sep} />
              <View style={styles.footer}>
                <AppIcon name="calendar-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.date}>Joined {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SIZES.lg, paddingTop: 56, paddingBottom: SIZES.sm,
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.surface, paddingHorizontal: SIZES.lg, paddingBottom: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: {
    flex: 1, height: 40, backgroundColor: COLORS.background, borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },

  list: { padding: SIZES.lg, gap: SIZES.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { padding: SIZES.xl, alignItems: 'center', gap: SIZES.sm },
  emptyTxt: { color: COLORS.textMuted, fontSize: 14 },

  card: { padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  email: { fontSize: 13, color: COLORS.textMuted },
  
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleTxt: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  
  roleAdmin: { backgroundColor: COLORS.errorLight },
  roleTxtAdmin: { color: COLORS.error },
  roleManager: { backgroundColor: COLORS.accentLight },
  roleTxtManager: { color: COLORS.accent },
  roleCustomer: { backgroundColor: COLORS.successLight },
  roleTxtCustomer: { color: COLORS.success },

  sep: { marginVertical: SIZES.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 12, color: COLORS.textMuted },
});
