import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/session';
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

// 화면 흐름: (목표 없음) S1 목표 설정 → 옆 메뉴(S2 홈 · S4 계획 · S3 러닝 · S6 기록). 로그인 없음
// 폰 DB를 확인하는 동안(loading)은 스플래시가 덮고 있습니다.
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
      <Stack.Protected guard={status !== 'ready'}>
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
