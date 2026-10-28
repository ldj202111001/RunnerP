// 코스 지형 분석: 100m 간격 고도 프로필로 고도 범위와 경사를 계산합니다 (server/app/services/terrain.py를 옮김).
// 경사(%) = 100m 사이 고도차 ÷ 100m × 100. 센서 잡음 때문에 3점 이동평균으로 고른 뒤 계산합니다.

// 고도 프로필 간격. 측정 요약(sensors/summary.ts)도 이 값으로 프로필을 만듭니다.
export const PROFILE_INTERVAL_M = 100;
const HILL_GRADE_PCT = 3; // 이 이상 오르면 오르막, 이 이상 내려가면 내리막으로 셈
const GRADE_LIMIT_PCT = 999.9;

export interface Terrain {
  min_altitude_m: number | null;
  max_altitude_m: number | null;
  uphill_distance_m: number | null;
  downhill_distance_m: number | null;
  max_grade_pct: number | null;
  min_grade_pct: number | null;
}

function smooth(profile: number[]): number[] {
  if (profile.length < 3) return [...profile];
  const inner = profile.slice(1, -1).map((_, i) => (profile[i] + profile[i + 1] + profile[i + 2]) / 3);
  return [profile[0], ...inner, profile[profile.length - 1]];
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const clampGrade = (g: number) => round1(Math.max(-GRADE_LIMIT_PCT, Math.min(GRADE_LIMIT_PCT, g)));

// 고도가 없으면 전부 null, 지점이 1개뿐이면 경사 값만 null
export function analyzeProfile(profile: number[], intervalM: number = PROFILE_INTERVAL_M): Terrain {
  const result: Terrain = {
    min_altitude_m: null,
    max_altitude_m: null,
    uphill_distance_m: null,
    downhill_distance_m: null,
    max_grade_pct: null,
    min_grade_pct: null,
  };
  if (profile.length === 0) return result;
  result.min_altitude_m = Math.round(Math.min(...profile));
  result.max_altitude_m = Math.round(Math.max(...profile));
  if (profile.length < 2) return result;

  const s = smooth(profile);
  const grades = s.slice(1).map((b, i) => ((b - s[i]) / intervalM) * 100);
  result.uphill_distance_m = grades.filter((g) => g >= HILL_GRADE_PCT).length * intervalM;
  result.downhill_distance_m = grades.filter((g) => g <= -HILL_GRADE_PCT).length * intervalM;
  result.max_grade_pct = clampGrade(Math.max(...grades));
  result.min_grade_pct = clampGrade(Math.min(...grades));
  return result;
}
