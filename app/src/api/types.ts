// 서버 API 요청·응답 타입 (전체구조설계서 3장 기준)

export type Gender = 'M' | 'F' | 'OTHER';
export type SessionType = 'EASY' | 'LONG' | 'TEMPO' | 'INTERVAL' | 'REST';
export type SessionStatus = 'PLANNED' | 'DONE' | 'MISSED';
export type GoalStatus = 'ACTIVE' | 'DONE' | 'DROPPED';
export type GoalType = 'HEALTH' | 'IMPROVE' | 'RACE'; // 건강·습관 / 기록 향상 / 대회 준비
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// 인증·사용자
export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface SignupResponse {
  user_id: number;
  access_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

// PUT은 보낸 필드만 바꿈. 신체 정보는 온보딩에서 묻지 않아 모두 선택
export interface Profile {
  weekly_days: number; // 2–6, 가능한 요일 수 이하
  availability?: Partial<Record<Weekday, number>> | null; // 요일별 가능 시간(분), 0 = 불가
  gender?: Gender | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
}

export interface Me {
  id: number;
  email: string;
  nickname: string;
  profile: Profile | null;
}

// 목표
// type별 필드 (설계서 3.2). 비운 값은 서버 기본값: 주 150분, 목표 기록 = 현재 예상의 95%
export type GoalCreateRequest = { recent_5k_sec?: number } & ( // 콜드 스타트용 (Riegel), 없으면 35분
  | { type: 'HEALTH'; weekly_minutes_target?: number }
  | { type: 'IMPROVE'; distance_km: number; target_time_sec?: number }
  | { type: 'RACE'; distance_km: number; target_date: string; target_time_sec?: number } // YYYY-MM-DD
);

export interface Goal {
  id: number;
  type: GoalType;
  distance_km: number | null; // 5 / 10 / 21.0975 / 42.195, HEALTH는 null
  target_time_sec: number | null;
  target_date: string | null; // RACE만
  weekly_minutes_target: number | null; // HEALTH만
  baseline_time_sec: number | null;
  status: GoalStatus;
}

export type GoalProgress =
  | { type: 'HEALTH'; goal_id: number; minutes_this_week: number; weekly_minutes_target: number; streak_weeks: number }
  | {
      type: 'IMPROVE' | 'RACE';
      goal_id: number;
      target_time_sec: number;
      baseline_time_sec: number | null;
      predicted_time_sec: number;
      weeks_left: number | null; // RACE만
      phase: PlanPhase | null; // RACE만
    };

export type PlanPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'MAINTAIN';

// 러닝 기록
export interface Split {
  km_index: number;
  pace_sec_per_km: number;
  elevation_delta_m: number;
}

export interface RunCreateRequest {
  started_at: string; // ISO 8601
  duration_sec: number;
  distance_m: number;
  avg_pace_sec_per_km: number;
  max_speed_mps: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  elevation_profile: number[]; // 출발점부터 100m마다의 고도 (m)
  steps: number | null;
  route_polyline: string;
  splits: Split[];
  planned_session_id: number | null;
}

export interface Run extends RunCreateRequest {
  id: number;
  cadence_spm: number | null;
  // 서버가 elevation_profile로 계산한 코스 지형 (고도 데이터가 없으면 null)
  min_altitude_m: number | null;
  max_altitude_m: number | null;
  uphill_distance_m: number | null;
  downhill_distance_m: number | null;
  max_grade_pct: number | null;
  min_grade_pct: number | null;
  rpe: number | null;
  completed: boolean | null;
  load: number | null;
  memo: string | null;
}

export interface RunFeedbackRequest {
  rpe: number; // 1–10
  completed: boolean;
  memo?: string;
}

export interface PlannedSession {
  id: number;
  date: string;
  type: SessionType;
  distance_km: number;
  target_pace_sec_per_km: number;
  target_rpe: number;
  description: string;
  status: SessionStatus;
  condition: number | null; // 출발 전 컨디션 1–5
  downgraded: boolean; // 컨디션 때문에 한 단계 낮췄는지
}

export interface RunFeedbackResponse {
  run_id: number;
  load: number;
  acwr: number;
  prediction: {
    goal_distance_km: number;
    predicted_time_sec: number;
    delta_sec: number;
  };
  next_session: Pick<PlannedSession, 'date' | 'type' | 'distance_km' | 'target_pace_sec_per_km'> | null;
  reason: string;
}

// 기간 합계 (GET /runs/summary)
export interface RunTotals {
  count: number;
  distance_m: number;
  duration_sec: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  total: number;
}

// 추천·계획
export interface TodayPlan {
  session: PlannedSession | null; // null이면 휴식일
  reason: string;
}

export interface WeekPlan {
  week_start: string;
  sessions: PlannedSession[];
  target_load: number;
  target_distance_km: number;
  phase: PlanPhase;
  easy_ratio: number;
  acwr: number | null; // 기록 4주 미만이면 null
  reason: string;
}

// 통계
export interface WeeklyStat {
  week_start: string;
  distance_km: number;
  load: number;
  acwr: number | null;
  predicted_time_sec: number | null;
}
