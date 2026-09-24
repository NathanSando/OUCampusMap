import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import type { IconName } from '@/constants/categories';
import { APP_NAME } from '@/constants/config';
import { colors, fonts, radius, space } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Logo } from './AppHeader';
import { AppText } from './AppText';
import { Button } from './Button';

type Mode = 'sign-in' | 'sign-up';

/** Email + password auth via Supabase (design doc §10). Returns to `redirect` on success. */
export function AuthForm({ mode }: { mode: Mode }) {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    if (redirect) router.replace(redirect as Href);
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const submit = async () => {
    if (!supabase) return;
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    const { error: authError, data } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { display_name: displayName.trim() || null } },
          });
    setBusy(false);
    if (authError) return setError(authError.message);
    if (mode === 'sign-up' && !data.session) {
      // Email confirmation is on for this project (design doc §15).
      return setError('Check your email to confirm your account, then sign in.');
    }
    done();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Logo size={64} />
          <AppText variant="headlineLg" style={styles.center}>
            University of Oklahoma
          </AppText>
          <AppText variant="headlineMd" color="#FFB3B1" style={styles.center}>
            {APP_NAME}
          </AppText>
          <AppText color={colors.textSecondary} style={styles.center}>
            Live campus wayfinding, accessibility, and student community alerts
          </AppText>
        </View>

        <View style={styles.card}>
          {mode === 'sign-up' && (
            <Field label="Display name (optional)" icon="account-outline">
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Boomer"
                placeholderTextColor={colors.textDisabled}
                style={styles.input}
                autoComplete="nickname"
                maxLength={40}
              />
            </Field>
          )}
          <Field label="Email address" icon="email-outline">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor={colors.textDisabled}
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </Field>
          <Field label="Password" icon="lock-outline">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'sign-up' ? 'At least 6 characters' : 'Enter password'}
              placeholderTextColor={colors.textDisabled}
              style={styles.input}
              secureTextEntry={!showPassword}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              style={styles.eye}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </Field>

          {error && (
            <AppText color={colors.error} accessibilityRole="alert">
              {error}
            </AppText>
          )}

          <Button
            label={mode === 'sign-in' ? 'Sign in' : 'Create account'}
            icon="arrow-right"
            loading={busy}
            onPress={submit}
          />

          <Pressable
            style={styles.switch}
            accessibilityRole="link"
            onPress={() =>
              router.replace({
                pathname: mode === 'sign-in' ? '/auth/sign-up' : '/auth/sign-in',
                params: redirect ? { redirect } : {},
              })
            }
          >
            <AppText variant="labelLg" color={colors.cream}>
              {mode === 'sign-in'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </AppText>
          </Pressable>
          <Pressable
            style={styles.switch}
            accessibilityRole="button"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          >
            <AppText variant="labelMd" color={colors.textSecondary}>
              Continue browsing as a guest
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, icon, children }: { label: string; icon: IconName; children: ReactNode }) {
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="labelLg" color={colors.textSecondary}>
        {label}
      </AppText>
      <View style={styles.field}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.textSecondary} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.xxl, paddingTop: space.xxl },
  brand: { alignItems: 'center', gap: space.xs },
  center: { textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.lg,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: space.sm,
  },
  eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
