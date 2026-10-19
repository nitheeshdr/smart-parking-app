import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { Button, Field } from '../../components/ui';
import { COLORS, SIZES } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <AppIcon name="car-sport-outline" size={34} color="#fff" />
          </View>
          <Text style={styles.brandName}>ParkSmart</Text>
          <Text style={styles.tagline}>Live parking, straight from the sensors.</Text>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Sign in as a customer or the lot admin.</Text>

          <Field label="Email" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
          <Field
            label="Password"
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            onSubmitEditing={signIn}
            returnKeyType="go"
          />
          <Text style={styles.toggle} onPress={() => setShowPw((v) => !v)}>{showPw ? 'Hide password' : 'Show password'}</Text>

          {error ? (
            <View style={styles.error}>
              <AppIcon name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <Button label={loading ? 'Signing in…' : 'Sign in'} icon="log-in-outline" onPress={signIn} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerTxt}>New here? </Text>
            <Text style={styles.link} onPress={() => router.push('/(auth)/register')}>Create an account</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1 },
  brand: { alignItems: 'center', paddingTop: 80, paddingBottom: SIZES.xl },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.md },
  brandName: { fontSize: 32, fontWeight: '900', color: '#fff' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  sheet: { flex: 1, backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXl, borderTopRightRadius: SIZES.radiusXl, padding: SIZES.xl, minHeight: 440 },
  heading: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, marginBottom: SIZES.lg },
  toggle: { color: COLORS.primary, fontSize: 13, fontWeight: '700', marginTop: -6, marginBottom: SIZES.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.errorLight, borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: SIZES.md },
  errorTxt: { color: COLORS.error, fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SIZES.lg },
  footerTxt: { color: COLORS.textMuted, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
});
