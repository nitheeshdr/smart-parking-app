import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { AppIcon } from '../../components/app-icon';
import { LiveDot, Screen } from '../../components/ui';
import { StaffOverview } from '../../components/staff-overview';
import { COLORS } from '../../constants/theme';

export default function AdminDashboard() {
  const { fullName, signOut } = useAuthStore();
  const confirmSignOut = () => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }]);
  return (
    <Screen
      title="Live parking"
      subtitle={`Signed in as ${fullName || 'admin'}`}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LiveDot />
          <Pressable onPress={confirmSignOut} hitSlop={10} accessibilityRole="button" accessibilityLabel="Sign out">
            <AppIcon name="log-out-outline" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      }
    >
      <StaffOverview />
    </Screen>
  );
}
