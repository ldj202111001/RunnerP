import {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLastKnownLocation } from '@/sensors/useLastKnownLocation';
import type { LatLng } from '@/sensors/useRunTracker';
import { distanceBetween } from '@/sensors/summary';
import { colors } from '@/theme';

import type { RunMapProps } from './RunMap';

// 위치를 아직 모를 때 보여줄 곳 (서울시청)
const FALLBACK_CENTER = { latitude: 37.5665, longitude: 126.978, zoom: 16 };
const ZOOM = 17;
// 측정 중에는 바탕 지도를 살짝 밝게(흐리게) 해서 경로선이 돋보이게 합니다. (-1 어둡게 ~ 1 밝게, 오버레이는 영향 없음)
const TRACKING_LIGHTNESS = 0.2;

// 경로를 따라 1km마다의 지점. 일시정지로 끊긴 구간 사이는 거리에 넣지 않습니다.
function kmMarks(route: LatLng[][]): { km: number; at: LatLng }[] {
  const marks: { km: number; at: LatLng }[] = [];
  let total = 0;
  for (const seg of route) {
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1];
      const b = seg[i];
      const d = distanceBetween(a, b);
      // 한 구간 안에서 1km 경계를 여러 번 넘을 수도 있습니다 (GPS가 오래 끊겼다 이어진 경우).
      while (d > 0 && Math.floor((total + d) / 1000) > marks.length) {
        const t = ((marks.length + 1) * 1000 - total) / d;
        marks.push({
          km: marks.length + 1,
          at: {
            latitude: a.latitude + (b.latitude - a.latitude) * t,
            longitude: a.longitude + (b.longitude - a.longitude) * t,
          },
        });
      }
      total += d;
    }
  }
  return marks;
}

// 네이버 지도 (개발 빌드 전용). 키는 app.config.ts의 NAVER_MAP_CLIENT_ID.
export function RunMapNaver({ route, position, follow, onUserPan }: RunMapProps) {
  const mapRef = useRef<NaverMapViewRef>(null);
  const [ready, setReady] = useState(false);
  const lastKnown = useLastKnownLocation();
  const insets = useSafeAreaInsets();
  const me = position ?? lastKnown;
  const tracking = route.some((seg) => seg.length > 0);
  const start = route.find((seg) => seg.length > 0)?.[0];
  const marks = useMemo(() => kmMarks(route), [route]);

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
      lightness={tracking ? TRACKING_LIGHTNESS : 0}
      isShowLocationButton={false}
      isShowZoomControls={false}
      isShowScaleBar={false}
      isShowCompass={false}
      isTiltGesturesEnabled={false}
      // 아래쪽은 측정 패널이 덮으므로 네이버 로고(표시 의무)를 오른쪽 위, 위치 버튼 아래에 둡니다.
      logoAlign="TopRight"
      logoMargin={{ top: insets.top + 64, right: 12 }}
    >
      {route.map((seg, i) =>
        seg.length >= 2 ? (
          <NaverMapPathOverlay
            key={i}
            coords={seg}
            width={7}
            color={colors.primary}
            outlineWidth={2}
            outlineColor="#FFFFFF"
          />
        ) : null,
      )}

      {start ? (
        <NaverMapMarkerOverlay
          {...start}
          width={22}
          height={22}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={10}
          caption={{ text: '출발', textSize: 12, color: colors.ink, haloColor: '#FFFFFF' }}
        >
          <View style={styles.startDot} />
        </NaverMapMarkerOverlay>
      ) : null}

      {marks.map(({ km, at }) => (
        <NaverMapMarkerOverlay key={km} {...at} width={30} height={22} anchor={{ x: 0.5, y: 0.5 }} zIndex={20}>
          <View style={styles.kmPill}>
            <Text style={styles.kmText}>{km}</Text>
          </View>
        </NaverMapMarkerOverlay>
      ))}

      {/* 네이버 기본 파란 위치 점 대신 브랜드 색 점 + 옅은 원 */}
      {me ? (
        <NaverMapMarkerOverlay {...me} width={44} height={44} anchor={{ x: 0.5, y: 0.5 }} zIndex={30}>
          <View style={styles.meHalo}>
            <View style={styles.meDot} />
          </View>
        </NaverMapMarkerOverlay>
      ) : null}
    </NaverMapView>
  );
}

const styles = StyleSheet.create({
  startDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  kmPill: {
    width: 30,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kmText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  meHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 90, 54, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});
