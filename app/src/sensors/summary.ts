import type { RunCreateRequest, Split } from '@/api/types';
import { PROFILE_INTERVAL_M } from '@/engine/terrain';

// 측정 중 버퍼에 쌓는 지점 (필터를 통과한 것만)
export interface TrackPoint {
  timestamp: number; // ms, 실제 시각
  elapsedMs: number; // 일시정지를 뺀 운동 시간
  segment: number; // 일시정지 후 재개할 때마다 +1 (구간 사이 거리는 세지 않음)
  latitude: number;
  longitude: number;
  altitude: number | null; // m, 기압계가 있으면 기압 고도, 없으면 GPS 고도
  speed: number | null; // m/s
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// 고도가 이만큼 오르내려야 변화로 인정 (센서 잡음 무시)
const ELEVATION_THRESHOLD_M = 3;
const MAX_PACE_SEC = 32_767; // DB SMALLINT 상한

// 두 지점 사이 거리 (haversine, m)
export function distanceBetween(
  a: Pick<TrackPoint, 'latitude' | 'longitude'>,
  b: Pick<TrackPoint, 'latitude' | 'longitude'>,
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// 같은 구간(segment) 안에서만 거리를 더합니다.
export function segmentDistance(prev: TrackPoint, cur: TrackPoint): number {
  return prev.segment === cur.segment ? distanceBetween(prev, cur) : 0;
}

export function paceSecPerKm(distanceM: number, seconds: number): number {
  if (distanceM <= 0) return 0;
  return Math.min(Math.round(seconds / (distanceM / 1000)), MAX_PACE_SEC);
}

// Google 인코딩 폴리라인 (정밀도 1e-5)
export function encodePolyline(points: TrackPoint[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let out = '';

  const encode = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };

  for (const p of points) {
    const lat = Math.round(p.latitude * 1e5);
    const lng = Math.round(p.longitude * 1e5);
    encode(lat - prevLat);
    encode(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

// encodePolyline의 반대: 서버에 저장된 경로를 지도에 그릴 때 씁니다.
export function decodePolyline(encoded: string): Pick<TrackPoint, 'latitude' | 'longitude'>[] {
  const points: Pick<TrackPoint, 'latitude' | 'longitude'>[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;

  const decode = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && i < encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (i < encoded.length) {
    lat += decode();
    lng += decode();
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// 잡음을 무시한 누적 상승·하강 고도: 기준점에서 임계값 이상 오르내려야 변화로 더하고 기준점을 옮깁니다.
export function elevationChange(points: TrackPoint[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  let base: number | null = null;
  for (const p of points) {
    if (p.altitude == null) continue;
    if (base == null) {
      base = p.altitude;
    } else if (p.altitude - base >= ELEVATION_THRESHOLD_M) {
      gain += p.altitude - base;
      base = p.altitude;
    } else if (base - p.altitude >= ELEVATION_THRESHOLD_M) {
      loss += base - p.altitude;
      base = p.altitude;
    }
  }
  return { gain, loss };
}

// 코스 고도 프로필: 출발점부터 PROFILE_INTERVAL_M마다의 고도 (선형 보간, 0.1m 단위).
// 원본 시계열 대신 이것만 보내고, 경사는 서버가 이 프로필로 계산합니다.
export function elevationProfile(points: TrackPoint[]): number[] {
  const profile: number[] = [];
  let distance = 0;
  let nextAt = 0;
  let prev: { distance: number; altitude: number } | null = null;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) distance += segmentDistance(points[i - 1], points[i]);
    const altitude = points[i].altitude;
    if (altitude == null) continue;
    const cur = { distance, altitude };

    if (prev == null) {
      // 고도를 처음 얻은 지점 전까지는 그 고도로 채웁니다.
      while (nextAt <= cur.distance) {
        profile.push(Math.round(cur.altitude * 10) / 10);
        nextAt += PROFILE_INTERVAL_M;
      }
    } else {
      while (nextAt <= cur.distance) {
        const span = cur.distance - prev.distance;
        const ratio = span > 0 ? (nextAt - prev.distance) / span : 1;
        profile.push(Math.round((prev.altitude + (cur.altitude - prev.altitude) * ratio) * 10) / 10);
        nextAt += PROFILE_INTERVAL_M;
      }
    }
    prev = cur;
  }
  return profile;
}

// 러닝 종료 시 버퍼를 요약값으로 바꿉니다. 원본 시계열은 서버로 보내지 않습니다.
// durationSec은 일시정지 시간을 뺀 실제 운동 시간입니다.
export function summarizeRun(
  points: TrackPoint[],
  durationSec: number,
  startedAt: number,
  steps: number | null,
  plannedSessionId: number | null,
): RunCreateRequest {
  let distance = 0;
  let maxSpeed = 0;

  const splits: Split[] = [];
  let splitStartElapsed = points[0]?.elapsedMs ?? 0;
  let splitStartAlt = points[0]?.altitude ?? null;
  let nextSplitAt = 1000;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const step = segmentDistance(prev, cur);

    // 1km 경계를 지나는 순간의 운동 시간을 선형 보간으로 구합니다.
    while (step > 0 && distance + step >= nextSplitAt) {
      const ratio = (nextSplitAt - distance) / step;
      const crossElapsed = prev.elapsedMs + (cur.elapsedMs - prev.elapsedMs) * ratio;
      const crossAlt = cur.altitude ?? prev.altitude;
      splits.push({
        km_index: splits.length + 1,
        pace_sec_per_km: Math.min(Math.round((crossElapsed - splitStartElapsed) / 1000), MAX_PACE_SEC),
        elevation_delta_m: crossAlt != null && splitStartAlt != null ? Math.round(crossAlt - splitStartAlt) : 0,
      });
      splitStartElapsed = crossElapsed;
      splitStartAlt = crossAlt;
      nextSplitAt += 1000;
    }

    distance += step;
    if (cur.speed != null && cur.speed > maxSpeed) {
      maxSpeed = cur.speed;
    }
  }

  const elevation = elevationChange(points);
  return {
    started_at: new Date(startedAt).toISOString(),
    duration_sec: Math.round(durationSec),
    distance_m: Math.round(distance),
    avg_pace_sec_per_km: paceSecPerKm(distance, durationSec),
    max_speed_mps: Math.round(Math.min(maxSpeed, 99) * 100) / 100,
    elevation_gain_m: Math.round(elevation.gain),
    elevation_loss_m: Math.round(elevation.loss),
    elevation_profile: elevationProfile(points),
    steps,
    route_polyline: encodePolyline(points),
    splits,
    planned_session_id: plannedSessionId,
  };
}
