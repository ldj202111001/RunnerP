import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/auth/session';
import { SplashScreenController } from '@/splash';
import { colors, type } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <SplashScreenController />
        <RootNavigator />
        <StatusBar style="auto" />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

// 화면 흐름: S0 로그인 → (첫 로그인) S1 목표 설정 → 옆 메뉴(S2 홈 · S4 계획 · S3 러닝 · S6 기록)
function RootNavigator() {
  const { status } = useSession();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { ...type.h3, color: colors.text },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={status === 'signedOut' || status === 'loading'}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'needsGoal'}>
        <Stack.Screen name="goal-setup" options={{ title: '목표 설정' }} />
      </Stack.Protected>

      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="run-result" options={{ title: '러닝 결과', headerBackVisible: false }} />
        <Stack.Screen name="runs/[id]" options={{ title: '러닝 상세' }} />
      </Stack.Protected>
    </Stack>
  );
}
