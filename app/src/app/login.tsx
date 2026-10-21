import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authApi } from '@/api/endpoints';
import { useSession } from '@/auth/session';
import { Button } from '@/components/Button';
import { colors } from '@/theme';

// S0 로그인·회원가입
export default function LoginScreen() {
  const { signIn, previewWithoutServer } = useSession();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>러닝 플래너</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {mode === 'signup' ? (
          <TextInput style={styles.input} placeholder="닉네임" value={nickname} onChangeText={setNickname} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={mode === 'login' ? '로그인' : '회원가입'} onPress={submit} disabled={submitting} />
        <Button
          variant="secondary"
          label={mode === 'login' ? '회원가입하기' : '로그인으로 돌아가기'}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        />
        {__DEV__ ? <Button variant="secondary" label="[개발] 서버 없이 둘러보기" onPress={previewWithoutServer} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 32, color: colors.text },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 16 },
  error: { color: colors.danger },
});
