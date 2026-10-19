import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { AppIcon } from '../../components/app-icon';

type IconName = React.ComponentProps<typeof AppIcon>['name'];
function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <AppIcon name={name} color={color} size={size ?? 22} />;
}
const icon = (name: IconName) => function renderIcon({ color, size }: { color: ColorValue; size: number }) {
  return <TabIcon name={name} color={color} size={size} />;
};

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Live', tabBarIcon: icon('pulse-outline') }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: icon('scan-outline') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="lot" options={{ title: 'Lot', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="lot-edit" options={{ href: null }} />
    </Tabs>
  );
}
