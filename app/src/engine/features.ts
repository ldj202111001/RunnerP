// ML 피처 정의. 학습(ml/train.py)이 쓴 server/app/services/features.py와 똑같이 계산해야 합니다.
// 바꾸면 ml/export_app_model.py → npm run check:engine으로 파이썬과 같은지 확인하세요.
// - 입력은 runs 테이블에 있는 값만: 시작 시각, 거리, 시간, 상승 고도 (설계 원칙 5)
// - 심박수·케이던스·나이는 쓰지 않습니다.

const WINDOW_DAYS = 28;
const DAY_MS = 86_400_000;
const BEST_PACE_MIN_M = 3000; // 최고 페이스는 3km 이상 러닝만

export const FEATURE_NAMES = [
  'dist_4w_km',
  'runs_4w',
  'avg_pace_4w',
  'best_pace_4w',
  'longest_run_4w_km',
  'elev_gain_4w_m',
  'days_since_last',
  'gender_male',
  'target_distance_km',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];
export type Features = Record<FeatureName, number | null>;
export type Gender = 'M' | 'F' | 'OTHER';

export interface RunRecord {
  startedAt: Date;
  distanceM: number;
  durationSec: number;
  elevationGainM: number | null;
}

function pace(distanceM: number, durationSec: number): number {
  return durationSec / (distanceM / 1000);
}

// M → 1, F → 0, 그 밖(OTHER·모름) → null (모델이 결측으로 처리)
function genderMale(gender: Gender | null): number | null {
  return gender === 'M' ? 1 : gender === 'F' ? 0 : null;
}

// asOf 직전 28일 기록으로 피처를 만듭니다. 그 기간에 러닝이 없으면 null (콜드 스타트는 Riegel로)
export function buildFeatures(
  history: RunRecord[],
  asOf: Date,
  gender: Gender | null,
  targetDistanceKm: number,
): Features | null {
  const end = asOf.getTime();
  const since = end - WINDOW_DAYS * DAY_MS;
  const recent = history.filter((r) => {
    const t = r.startedAt.getTime();
    return t >= since && t < end;
  });
  if (recent.length === 0) return null;

  const totalM = recent.reduce((s, r) => s + r.distanceM, 0);
  const totalSec = recent.reduce((s, r) => s + r.durationSec, 0);
  const longRuns = recent.filter((r) => r.distanceM >= BEST_PACE_MIN_M);
  const gains = recent.flatMap((r) => (r.elevationGainM == null ? [] : [r.elevationGainM]));
  const last = Math.max(...recent.map((r) => r.startedAt.getTime()));

  return {
    dist_4w_km: totalM / 1000,
    runs_4w: recent.length,
    avg_pace_4w: pace(totalM, totalSec),
    best_pace_4w: longRuns.length ? Math.min(...longRuns.map((r) => pace(r.distanceM, r.durationSec))) : null,
    longest_run_4w_km: Math.max(...recent.map((r) => r.distanceM)) / 1000,
    elev_gain_4w_m: gains.length ? gains.reduce((s, g) => s + g, 0) : null,
    days_since_last: (end - last) / DAY_MS,
    gender_male: genderMale(gender),
    target_distance_km: targetDistanceKm,
  };
}

// Riegel 공식: T2 = T1 × (D2 / D1)^1.06 (콜드 스타트·비교 기준용)
export function riegelTimeSec(knownDistanceM: number, knownTimeSec: number, targetDistanceM: number): number {
  return knownTimeSec * (targetDistanceM / knownDistanceM) ** 1.06;
}
