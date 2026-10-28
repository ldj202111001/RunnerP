// 목표. 예전 POST /goals, GET /goals/current, PUT /goals/{id}
// 목표를 만들거나 고칠 때 지금 실력을 예측(engine/predictor)해 시작 기록과 예측 이력을 남깁니다.

import type { Goal, GoalCreateRequest } from './types';

import { predict } from '../engine/predictor';
import { getProfile } from './profile';
import { runHistory } from './runs';
import { NotFoundError, toJson, ValidationError, type Db } from './sqlite';

// 기본값 (설계서 7절)
const DEFAULT_WEEKLY_MINUTES = 150; // HEALTH 주간 목표 시간, WHO 권고
const UNKNOWN_5K_SEC = 35 * 60; // 기록도 5K 입력도 없을 때 시작값
const TARGET_RATIO = 0.95; // 목표 기록을 비우면 현재 예상 기록보다 5% 빠르게
const HEALTH_REFERENCE_KM = 5; // HEALTH는 거리가 없으므로 5K로 예측 (페이스 구간 계산용)
const RACE_DISTANCES_KM = [5, 10, 21.0975, 42.195];
const MIN_WEEKS_TO_RACE = 2;

// 오늘 날짜 (현지 기준 YYYY-MM-DD)
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validate(body: GoalCreateRequest, today: Date): void {
  if (body.recent_5k_sec != null && (body.recent_5k_sec < 12 * 60 || body.recent_5k_sec > 90 * 60)) {
    throw new ValidationError('최근 5K 기록은 12분–90분 사이여야 합니다.');
  }
  if (body.type === 'HEALTH') {
    const m = body.weekly_minutes_target;
    if (m != null && (m < 30 || m > 1200)) throw new ValidationError('주간 목표 시간은 30–1200분이어야 합니다.');
    return;
  }
  if (!RACE_DISTANCES_KM.includes(body.distance_km)) {
    throw new ValidationError('종목은 5K·10K·하프·풀 중 하나여야 합니다.');
  }
  const t = body.target_time_sec;
  if (t != null && (t <= 0 || t > 12 * 3600)) throw new ValidationError('목표 기록을 확인해 주세요.');
  if (body.type === 'RACE') {
    const earliest = new Date(today);
    earliest.setDate(earliest.getDate() + MIN_WEEKS_TO_RACE * 7);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.target_date) || body.target_date < localDate(earliest)) {
      throw new ValidationError(`대회 날짜는 오늘부터 ${MIN_WEEKS_TO_RACE}주 이후여야 합니다.`);
    }
  }
}

async function getGoal(db: Db, id: number): Promise<Goal | null> {
  return db.getFirstAsync<Goal>(
    `SELECT id, type, distance_km, target_time_sec, target_date, weekly_minutes_target, baseline_time_sec, status
     FROM goals WHERE id = ?`,
    [id],
  );
}

// 진행 중 목표. 없으면 null → S1 목표 설정으로
export async function currentGoal(db: Db): Promise<Goal | null> {
  const row = await db.getFirstAsync<{ id: number }>("SELECT id FROM goals WHERE status = 'ACTIVE'", []);
  return row ? getGoal(db, row.id) : null;
}

// 요청 값 + 시작 예측. 새 목표면 id = null (기존 ACTIVE 목표는 DROPPED)
async function save(db: Db, id: number | null, body: GoalCreateRequest, now: Date): Promise<Goal> {
  validate(body, now);
  const distanceKm = body.type === 'HEALTH' ? HEALTH_REFERENCE_KM : body.distance_km;
  const history = await runHistory(db);
  const gender = (await getProfile(db))?.gender ?? null;
  const result =
    predict(history, gender, distanceKm, now, body.recent_5k_sec) ??
    predict(history, gender, distanceKm, now, UNKNOWN_5K_SEC);
  if (!result) throw new Error('예상 기록을 계산하지 못했습니다.'); // 5K 시작값을 주면 항상 예측됨

  const fields = {
    type: body.type,
    distance_km: body.type === 'HEALTH' ? null : body.distance_km,
    target_date: body.type === 'RACE' ? body.target_date : null,
    weekly_minutes_target: body.type === 'HEALTH' ? (body.weekly_minutes_target ?? DEFAULT_WEEKLY_MINUTES) : null,
    target_time_sec:
      body.type === 'HEALTH'
        ? null
        : (body.target_time_sec ?? Math.round(result.predictedTimeSec * TARGET_RATIO)),
    baseline_time_sec: result.predictedTimeSec,
  };
  const values = [
    fields.type,
    fields.distance_km,
    fields.target_date,
    fields.weekly_minutes_target,
    fields.target_time_sec,
    fields.baseline_time_sec,
  ];

  let goalId = id ?? 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    if (id == null) {
      await txn.runAsync("UPDATE goals SET status = 'DROPPED' WHERE status = 'ACTIVE'", []);
      const res = await txn.runAsync(
        `INSERT INTO goals (type, distance_km, target_date, weekly_minutes_target, target_time_sec, baseline_time_sec)
         VALUES (?, ?, ?, ?, ?, ?)`,
        values,
      );
      goalId = res.lastInsertRowId;
    } else {
      await txn.runAsync(
        `UPDATE goals SET type = ?, distance_km = ?, target_date = ?, weekly_minutes_target = ?,
           target_time_sec = ?, baseline_time_sec = ? WHERE id = ?`,
        [...values, id],
      );
    }
    await txn.runAsync(
      'INSERT INTO predictions (goal_id, predicted_time_sec, model_version, features_json) VALUES (?, ?, ?, ?)',
      [goalId, result.predictedTimeSec, result.modelVersion ?? result.method, toJson(result.features ?? {})],
    );
    // 첫 주간 계획은 planner 구현 후 여기서 생성 (설계서 5.2 ①)
  });
  return (await getGoal(db, goalId)) as Goal;
}

export function createGoal(db: Db, body: GoalCreateRequest, now: Date = new Date()): Promise<Goal> {
  return save(db, null, body, now);
}

export async function updateGoal(db: Db, id: number, body: GoalCreateRequest, now: Date = new Date()): Promise<Goal> {
  const goal = await getGoal(db, id);
  if (!goal) throw new NotFoundError('목표를 찾을 수 없습니다.');
  if (goal.status !== 'ACTIVE') throw new ValidationError('진행 중인 목표만 수정할 수 있습니다.');
  return save(db, id, body, now);
}
