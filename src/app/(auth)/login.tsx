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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Separator } from 'heroui-native';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { COLORS, SIZES } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErrorMsg(error.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo / brand */}
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <AppIcon name="car-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.brandName}>
            Park<Text style={styles.brandAccent}>Smart</Text>
          </Text>
          <Text style={styles.brandTagline}>Smart parking, simplified.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account to continue.</Text>

          <Separator style={styles.sep} />

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
              placeholder="••••••••"
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

          {/* Error */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <AppIcon name="alert-circle-outline" size={15} color={COLORS.error} />
              <Text style={styles.errorTxt}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* CTA */}
          <Button
            variant="primary"
            onPress={handleLogin}
            isDisabled={loading}
            style={styles.loginBtn}
          >
            <View style={styles.btnInner}>
              {loading
                ? <AppIcon name="reload-outline" size={18} color="#fff" />
                : <AppIcon name="log-in-outline" size={18} color="#fff" />
              }
              <Text style={styles.loginBtnTxt}>{loading ? 'Signing in…' : 'Sign In'}</Text>
            </View>
          </Button>

          <Separator style={styles.sep} />

          {/* Footer link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerTxt}>Don&apos;t have an account? </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, justifyContent: 'center' },

  brand: { alignItems: 'center', paddingTop: 72, paddingBottom: SIZES.xl },
  brandIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
    marginBottom: SIZES.md,
  },
  brandName: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  brandAccent: { color: 'rgba(255,255,255,0.65)' },
  brandTagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXl, borderTopRightRadius: SIZES.radiusXl,
    padding: SIZES.xl, paddingBottom: SIZES.xxl, flex: 1, minHeight: 460,
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

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.errorLight, borderRadius: SIZES.radius,
    padding: SIZES.md, marginBottom: SIZES.md,
  },
  errorTxt: { color: COLORS.error, fontSize: 13, flex: 1 },

  loginBtn: { height: 54, borderRadius: SIZES.radiusMd },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerTxt: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
});
