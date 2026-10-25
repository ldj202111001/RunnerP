import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authApi } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, radius, shadow, spacing, type } from '@/theme';

type Mode = 'login' | 'signup';

// S0 로그인·회원가입
export default function LoginScreen() {
  const { signIn, previewWithoutServer } = useSession();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '' && (mode === 'login' || nickname.trim() !== '');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { access_token } =
        mode === 'login'
          ? await authApi.login({ email, password })
          : await authApi.signup({ email, password, nickname });
      await signIn(access_token);
    } catch {
      setError(
        mode === 'login'
          ? '이메일 또는 비밀번호를 확인해 주세요.'
          : '회원가입에 실패했습니다. 이미 가입된 이메일인지 확인해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xxxl }]}>
          <View style={styles.logo}>
            <Ionicons name="flash" size={28} color="#fff" />
          </View>
          <Text style={styles.brand}>러닝 플래너</Text>
          <Text style={styles.tagline}>{'폰 하나로 기록하고,\n목표까지 똑똑하게 달리세요.'}</Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.segment}>
            {(['login', 'signup'] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.segmentItem, mode === m && styles.segmentActive]}
                onPress={() => switchMode(m)}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
              >
                <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <TextField
              icon="mail-outline"
              placeholder="이메일"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              icon="lock-closed-outline"
              placeholder="비밀번호"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {mode === 'signup' ? (
              <TextField icon="person-outline" placeholder="닉네임" value={nickname} onChangeText={setNickname} />
            ) : null}

            {error ? (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              style={styles.submit}
              label={mode === 'login' ? '로그인' : '가입하고 시작하기'}
              onPress={submit}
              loading={submitting}
              disabled={!canSubmit}
            />
            {__DEV__ ? <Button variant="ghost" label="[개발] 서버 없이 둘러보기" onPress={previewWithoutServer} /> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  hero: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxl },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  brand: { ...type.h1, fontSize: 32, color: colors.text },
  tagline: { ...type.body, fontSize: 17, lineHeight: 25, color: colors.textSecondary, marginTop: spacing.sm },
  sheet: { flex: 1, paddingHorizontal: spacing.xxl },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xxl,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface, ...shadow.card },
  segmentText: { ...type.bodyStrong, color: colors.muted },
  segmentTextActive: { color: colors.text },
  form: { gap: spacing.md },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
  submit: { marginTop: spacing.sm },
});
