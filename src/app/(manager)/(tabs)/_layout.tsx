import { Tabs } from 'expo-router';
import { COLORS } from '../../../constants/theme';
import { AppIcon } from '../../../components/app-icon';

export default function ManagerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <AppIcon name="grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan QR',
          tabBarIcon: ({ color }) => <AppIcon name="scan-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: 'My Lots',
          tabBarIcon: ({ color }) => <AppIcon name="business-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
