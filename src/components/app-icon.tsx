import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

/** Shared icon wrapper so screens use one consistent, accessible icon set. */
export function AppIcon({ name, size = 20, color = '#64748B' }: AppIconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}
