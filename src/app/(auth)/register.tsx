import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Separator } from 'heroui-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

type Role = 'customer' | 'parking_manager';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<Role>('customer');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setErrorMsg('Enter your name, a valid email, and a password of at least 6 characters.');
      return;
    }
    if (role === 'parking_manager' && (!businessName.trim() || !businessPhone.trim())) {
      setErrorMsg('Enter your business name and phone number to register as a manager.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          business_name: businessName.trim() || null,
          business_phone: businessPhone.trim() || null,
        },
      },
    });
    if (error) {
      setErrorMsg(error.message);
    } else {
      Alert.alert('Account created', 'Please check your email to verify before signing in.');
      router.replace('/(auth)/login');
    }
    setLoading(false);
  };

  const ROLES: { label: string; value: Role; icon: 'person-outline' | 'business-outline' }[] = [
    { label: 'Driver / Customer', value: 'customer', icon: 'person-outline' },
    { label: 'Parking Manager', value: 'parking_manager', icon: 'business-outline' },
  ];

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <AppIcon name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <AppIcon name="car-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.brandName}>
            Park<Text style={styles.brandAccent}>Smart</Text>
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Create account</Text>
          <Text style={styles.formSubtitle}>Sign up to get started today.</Text>

          <Separator style={styles.sep} />

          {/* Full name */}
          <Text style={styles.fieldLbl}>Full Name</Text>
          <View style={styles.inputWrap}>
            <AppIcon name="person-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Email */}
          <Text style={styles.fieldLbl}>Email</Text>
          <View style={styles.inputWrap}>
            <AppIcon name="mail-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={styles.fieldLbl}>Password</Text>
          <View style={styles.inputWrap}>
            <AppIcon name="lock-closed-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <Pressable
              onPress={() => setShowPw((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
              <AppIcon name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
            </Pressable>
          </View>

          {/* Role */}
          <Text style={styles.fieldLbl}>Register as</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Pressable
                key={r.value}
                style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                onPress={() => setRole(r.value)}
                accessibilityRole="button"
                accessibilityLabel={r.label}
              >
                <AppIcon
                  name={r.icon}
                  size={20}
                  color={role === r.value ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.roleTxt, role === r.value && styles.roleTxtActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Manager fields */}
          {role === 'parking_manager' && (
            <View>
              <Text style={styles.fieldLbl}>Business Name</Text>
              <View style={styles.inputWrap}>
                <AppIcon name="business-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Your parking business"
                  placeholderTextColor={COLORS.textMuted}
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>
              <Text style={styles.fieldLbl}>Business Phone</Text>
              <View style={styles.inputWrap}>
                <AppIcon name="call-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={COLORS.textMuted}
                  value={businessPhone}
                  onChangeText={setBusinessPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {/* Error */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <AppIcon name="alert-circle-outline" size={15} color={COLORS.error} />
              <Text style={styles.errorTxt}>{errorMsg}</Text>
            </View>
          ) : null}

          <Button
            variant="primary"
            onPress={handleRegister}
            isDisabled={loading}
            style={styles.submitBtn}
          >
            <View style={styles.btnInner}>
              <AppIcon name={loading ? 'reload-outline' : 'person-add-outline'} size={18} color="#fff" />
              <Text style={styles.submitBtnTxt}>{loading ? 'Creating account…' : 'Sign Up'}</Text>
            </View>
          </Button>

          <Separator style={styles.sep} />

          <View style={styles.footerRow}>
            <Text style={styles.footerTxt}>Already have an account? </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, paddingBottom: SIZES.xxl },
  topBar: { paddingHorizontal: SIZES.md, paddingTop: 56 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  brand: { alignItems: 'center', paddingTop: SIZES.lg, paddingBottom: SIZES.xl },
  brandIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.sm,
  },
  brandName: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  brandAccent: { color: 'rgba(255,255,255,0.65)' },

  card: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXl, borderTopRightRadius: SIZES.radiusXl,
    padding: SIZES.xl, paddingBottom: SIZES.xxl,
  },
  formTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: COLORS.textMuted },
  sep: { marginVertical: SIZES.lg },

  fieldLbl: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.background, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SIZES.md, height: 52, marginBottom: SIZES.md,
  },
  input: { flex: 1, color: COLORS.text, fontSize: 15 },

  roleRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.md },
  roleCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    padding: SIZES.md, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  roleTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, flex: 1 },
  roleTxtActive: { color: COLORS.primary },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.errorLight, borderRadius: SIZES.radius,
    padding: SIZES.md, marginBottom: SIZES.md,
  },
  errorTxt: { color: COLORS.error, fontSize: 13, flex: 1 },

  submitBtn: { height: 54, borderRadius: SIZES.radiusMd },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerTxt: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
});
