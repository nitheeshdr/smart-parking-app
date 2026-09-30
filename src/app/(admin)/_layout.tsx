import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { AppIcon } from '../../components/app-icon';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="bar-chart-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="people-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="managers"
        options={{
          title: 'Managers',
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="business-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="lots"
        options={{
          title: 'Lots',
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="map-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <AppIcon name="receipt-outline" color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tabs>
  );
}
