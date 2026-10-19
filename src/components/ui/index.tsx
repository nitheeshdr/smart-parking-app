import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../app-icon';
import { COLORS, SIZES } from '../../constants/theme';
import type { Tone } from './status';

type IconName = React.ComponentProps<typeof AppIcon>['name'];

/* ───────────── Screen ───────────── */

interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Show a back arrow (for pushed screens). */
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Wrap children in a ScrollView with pull-to-refresh. */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}

export function Screen({ title, subtitle, onBack, right, children, scroll = true, refreshing, onRefresh, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {title ? (
        <View style={styles.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
              <AppIcon name="chevron-back" size={22} color={COLORS.text} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padded && styles.body, { paddingBottom: insets.bottom + SIZES.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded && styles.body]}>{children}</View>
      )}
    </View>
  );
}

/* ───────────── Basics ───────────── */

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, icon, variant = 'primary', loading, disabled, small, style }: ButtonProps) {
  const palette = {
    primary: { bg: COLORS.primary, fg: COLORS.white, border: COLORS.primary },
    secondary: { bg: COLORS.primaryLight, fg: COLORS.primary, border: COLORS.primaryMid },
    danger: { bg: COLORS.errorLight, fg: COLORS.error, border: COLORS.errorMid },
    ghost: { bg: 'transparent', fg: COLORS.textSecondary, border: COLORS.border },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : icon ? <AppIcon name={icon} size={small ? 15 : 18} color={palette.fg} /> : null}
      <Text style={[styles.btnTxt, small && { fontSize: 13 }, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  error?: string;
}

export function Field({ label, icon, error, style, ...rest }: FieldProps) {
  return (
    <View style={{ marginBottom: SIZES.md }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputWrap, !!error && { borderColor: COLORS.error }]}>
        {icon ? <AppIcon name={icon} size={18} color={COLORS.textMuted} /> : null}
        <TextInput
          placeholderTextColor={COLORS.textDisabled}
          style={[styles.input, style]}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.badgeTxt, { color: tone.fg }]}>{label ?? tone.label}</Text>
    </View>
  );
}

export function StatCard({ label, value, icon, color = COLORS.primary, hint }: { label: string; value: string | number; icon: IconName; color?: string; hint?: string }) {
  return (
    <View style={[styles.stat]}>
      <View style={[styles.statIcon, { backgroundColor: color + '1A' }]}>
        <AppIcon name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, active && styles.segItemActive]} accessibilityRole="button">
            <Text style={[styles.segTxt, active && { color: COLORS.primary }]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {label ? <Text style={styles.centerTxt}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: IconName; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <AppIcon name={icon} size={30} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.centerTxt}>{hint}</Text> : null}
      {action ? <View style={{ marginTop: SIZES.md }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Could not load data.';
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Something went wrong"
      hint={msg}
      action={onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}

export function Row({ icon, label, value, color }: { icon?: IconName; label: string; value: React.ReactNode; color?: string }) {
  return (
    <View style={styles.row}>
      {icon ? <AppIcon name={icon} size={16} color={COLORS.textMuted} /> : null}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : null]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export function LiveDot() {
  return (
    <View style={styles.live}>
      <View style={styles.liveDot} />
      <Text style={styles.liveTxt}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingHorizontal: SIZES.md, paddingTop: SIZES.sm, paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  body: { padding: SIZES.md },

  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border,
    padding: SIZES.md, marginBottom: SIZES.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SIZES.sm, marginBottom: SIZES.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: SIZES.radiusMd, borderWidth: 1, paddingHorizontal: SIZES.lg,
  },
  btnSmall: { height: 38, paddingHorizontal: SIZES.md, borderRadius: SIZES.radius },
  btnTxt: { fontSize: 15, fontWeight: '700' },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, height: 50,
    backgroundColor: COLORS.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SIZES.md,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 0 },
  fieldError: { color: COLORS.error, fontSize: 12, marginTop: 4 },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.md },
  stat: {
    flexGrow: 1, flexBasis: '47%', backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMd,
    borderWidth: 1, borderColor: COLORS.border, padding: SIZES.md,
  },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.sm },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  statHint: { fontSize: 11, color: COLORS.textDisabled, marginTop: 2 },

  segmented: { flexDirection: 'row', backgroundColor: COLORS.surfaceHover, borderRadius: SIZES.radius, padding: 3, marginBottom: SIZES.md },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: SIZES.radiusSm },
  segItemActive: { backgroundColor: COLORS.surface },
  segTxt: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },

  center: { alignItems: 'center', justifyContent: 'center', padding: SIZES.xl, flex: 1, minHeight: 220 },
  centerTxt: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: SIZES.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceHover, alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingVertical: 7 },
  rowLabel: { fontSize: 13, color: COLORS.textMuted, width: 96 },
  rowValue: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'right' },

  live: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.successLight, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  liveTxt: { fontSize: 10, fontWeight: '800', color: COLORS.success, letterSpacing: 0.5 },
});
