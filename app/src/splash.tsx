import { SplashScreen } from 'expo-router';

import { useSession } from '@/auth/session';

SplashScreen.preventAutoHideAsync();

// 저장된 토큰과 목표 여부를 확인할 때까지 스플래시를 유지합니다.
export function SplashScreenController() {
  const { status } = useSession();

  if (status !== 'loading') {
    SplashScreen.hide();
  }

  return null;
}
