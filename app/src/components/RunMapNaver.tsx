import {
  NaverMapPathOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLastKnownLocation } from '@/sensors/useLastKnownLocation';
import { colors } from '@/theme';

import type { RunMapProps } from './RunMap';

// 위치를 아직 모를 때 보여줄 곳 (서울시청)
const FALLBACK_CENTER = { latitude: 37.5665, longitude: 126.978, zoom: 16 };
const ZOOM = 17;

// 네이버 지도 (개발 빌드 전용). 키는 app.config.ts의 NAVER_MAP_CLIENT_ID.
export function RunMapNaver({ route, position, follow, onUserPan }: RunMapProps) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [ready, setReady] = useState(false);
  const lastKnown = useLastKnownLocation();
  const insets = useSafeAreaInsets();
  const me = position ?? lastKnown;

  // 측정 전에는 마지막 위치로 이동만 합니다. 실제 위치가 들어오면 그쪽이 우선입니다.
  useEffect(() => {
    if (ready && lastKnown && !position) {
      mapRef.current?.animateCameraTo({ ...lastKnown, zoom: ZOOM, duration: 0 });
    }
  }, [ready, lastKnown, position]);

  useEffect(() => {
    if (ready && position && follow) {
      mapRef.current?.animateCameraTo({ ...position, duration: 500 });
    }
  }, [ready, position, follow]);

  return (
    <NaverMapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialCamera={FALLBACK_CENTER}
      onInitialized={() => setReady(true)}
      // 사용자가 손으로 지도를 움직였을 때만 따라가기를 풉니다 (코드로 옮긴 건 무시).
      onCameraChanged={({ reason }) => {
        if (reason === 'Gesture') onUserPan();
      }}
      isShowLocationButton={false}
      isShowZoomControls={false}
      isShowScaleBar={false}
      isShowCompass={false}
      isTiltGesturesEnabled={false}
      // 아래쪽은 측정 패널이 덮으므로 네이버 로고(표시 의무)를 오른쪽 위, 위치 버튼 아래에 둡니다.
      logoAlign="TopRight"
      logoMargin={{ top: insets.top + 64, right: 12 }}
      locationOverlay={{ isVisible: me != null, position: me ?? undefined }}
    >
      {route.map((seg, i) =>
        seg.length >= 2 ? (
          <NaverMapPathOverlay
            key={i}
            coords={seg}
            width={6}
            color={colors.primary}
            outlineWidth={1.5}
            outlineColor="#FFFFFF"
          />
        ) : null,
      )}
    </NaverMapView>
  );
}
