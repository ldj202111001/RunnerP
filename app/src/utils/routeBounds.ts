import type { LatLng } from '@/sensors/useRunTracker';

// 경로를 감싸는 영역 (남서쪽 꼭짓점 + 크기), 가장자리에 여백을 둡니다. points는 비어 있지 않아야 합니다.
export function routeBounds(points: LatLng[], padding = 0.15) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const minLng = Math.min(...lngs);
  // 한 점뿐이거나 아주 짧은 경로도 너무 확대되지 않게 최소 크기를 둡니다 (약 400m).
  const latSpan = Math.max(Math.max(...lats) - minLat, 0.004);
  const lngSpan = Math.max(Math.max(...lngs) - minLng, 0.004);
  return {
    latitude: minLat - latSpan * padding,
    longitude: minLng - lngSpan * padding,
    latitudeDelta: latSpan * (1 + 2 * padding),
    longitudeDelta: lngSpan * (1 + 2 * padding),
  };
}
