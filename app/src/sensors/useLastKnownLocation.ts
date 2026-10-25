import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from './useRunTracker';

// 지도 화면을 열면 권한을 받아 마지막 위치를 먼저 돌려주고, 이어서 현재 위치를 새로 받아 갱신합니다.
// 권한 거부·GPS 꺼짐이면 null 그대로입니다.
export function useLastKnownLocation(): LatLng | null {
  const [lastKnown, setLastKnown] = useState<LatLng | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (!granted || cancelled) return;
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) setLastKnown({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setLastKnown({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      } catch {
        // 위치를 못 받으면 지도는 기본 위치(서울시청)에 둡니다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return lastKnown;
}
