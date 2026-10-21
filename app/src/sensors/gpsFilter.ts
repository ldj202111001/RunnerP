import { distanceBetween, type TrackPoint } from './summary';

export interface GpsFix {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null; // m, 작을수록 정확
  speed: number | null;
}

export type FilterResult = 'accept' | 'inaccurate' | 'jump' | 'stationary';

const MAX_ACCURACY_M = 25; // 이보다 오차가 큰 지점은 버림
const MAX_SPEED_MPS = 10; // 36 km/h. 이보다 빠른 이동은 GPS 튐으로 판단
const MIN_MOVE_M = 2; // 제자리 흔들림 무시

// 새 GPS 지점을 기록할지 판정합니다. last는 같은 구간에서 마지막으로 받아들인 지점(없으면 null).
export function filterFix(last: TrackPoint | null, fix: GpsFix): FilterResult {
  if (fix.accuracy != null && fix.accuracy > MAX_ACCURACY_M) return 'inaccurate';
  if (last == null) return 'accept';

  const moved = distanceBetween(last, fix);
  const seconds = (fix.timestamp - last.timestamp) / 1000;
  if (seconds > 0 && moved / seconds > MAX_SPEED_MPS) return 'jump';
  if (moved < MIN_MOVE_M) return 'stationary';
  return 'accept';
}
