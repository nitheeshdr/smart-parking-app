import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AppIcon } from '../../components/app-icon';
import { Button, Field } from '../../components/ui';
import { COLORS, SIZES } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!fullName.trim()) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
    });
    setLoading(false);
    if (err) return setError(err.message);
    if (!data.session) {
      Alert.alert('Check your email', 'Confirm your email address, then sign in.', [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Text style={styles.back} onPress={() => router.back()}>‹ Back</Text>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>Book parking slots in seconds.</Text>
        </View>

        <Field label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" />
        <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Phone (optional)" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 …" />
        <Field label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />

        {error ? (
          <View style={styles.error}>
            <AppIcon name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        ) : null}

        <Button label="Create account" icon="person-add-outline" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { padding: SIZES.xl, paddingTop: 64, paddingBottom: SIZES.xxl },
  top: { marginBottom: SIZES.lg },
  back: { color: COLORS.primary, fontWeight: '700', fontSize: 15, marginBottom: SIZES.md },
  heading: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.errorLight, borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: SIZES.md },
  errorTxt: { color: COLORS.error, fontSize: 13, flex: 1 },
});
