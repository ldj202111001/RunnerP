import { NaverMapMarkerOverlay, NaverMapPathOverlay, NaverMapView } from '@mj-studio/react-native-naver-map';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { routeBounds } from '@/utils/routeBounds';

import type { RouteMapProps } from './RouteMap';

// 네이버 지도 (개발 빌드 전용)
export function RouteMapNaver({ points }: RouteMapProps) {
  const region = useMemo(() => routeBounds(points), [points]);
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <NaverMapView
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      isScrollGesturesEnabled={false}
      isZoomGesturesEnabled={false}
      isRotateGesturesEnabled={false}
      isTiltGesturesEnabled={false}
      isShowLocationButton={false}
      isShowZoomControls={false}
      isShowScaleBar={false}
      isShowCompass={false}
    >
      {points.length >= 2 ? (
        <NaverMapPathOverlay coords={points} width={6} color={colors.primary} outlineWidth={2} outlineColor="#FFFFFF" />
      ) : null}
      {end && points.length >= 2 ? (
        <NaverMapMarkerOverlay {...end} width={18} height={18} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
          <View style={[styles.dot, { backgroundColor: colors.ink }]} />
        </NaverMapMarkerOverlay>
      ) : null}
      {start ? (
        <NaverMapMarkerOverlay {...start} width={18} height={18} anchor={{ x: 0.5, y: 0.5 }} zIndex={20}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
        </NaverMapMarkerOverlay>
      ) : null}
    </NaverMapView>
  );
}

const styles = StyleSheet.create({
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF' },
});
