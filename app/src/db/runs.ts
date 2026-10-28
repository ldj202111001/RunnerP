// 러닝 기록. 예전 POST·GET·DELETE /runs, GET /runs/summary
// 저장할 때 고도 프로필로 코스 지형(engine/terrain)과 케이던스를 계산해 함께 넣습니다.

import type { Page, Run, RunCreateRequest, RunTotals, Split } from './types';

import type { RunRecord } from '../engine/features';
import { analyzeProfile } from '../engine/terrain';
import { fromJson, NotFoundError, toJson, type Db } from './sqlite';

export const PAGE_SIZE = 20;

const toIso = (v: string) => new Date(v).toISOString();

interface RunRow extends Omit<Run, 'elevation_profile' | 'completed' | 'splits'> {
  elevation_profile: string | null;
  completed: number | null;
}

async function withSplits(db: Db, rows: RunRow[]): Promise<Run[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const splits = await db.getAllAsync<Split & { run_id: number }>(
    `SELECT run_id, km_index, pace_sec_per_km, elevation_delta_m FROM run_splits
     WHERE run_id IN (${ids.map(() => '?').join(',')}) ORDER BY km_index`,
    ids,
  );
  return rows.map((r) => ({
    ...r,
    elevation_profile: fromJson<number[]>(r.elevation_profile) ?? [],
    completed: r.completed == null ? null : r.completed === 1,
    splits: splits
      .filter((s) => s.run_id === r.id)
      .map(({ km_index, pace_sec_per_km, elevation_delta_m }) => ({ km_index, pace_sec_per_km, elevation_delta_m })),
  }));
}

export async function getRun(db: Db, id: number): Promise<Run> {
  const row = await db.getFirstAsync<RunRow>('SELECT * FROM runs WHERE id = ?', [id]);
  if (!row) throw new NotFoundError('러닝 기록을 찾을 수 없습니다.');
  return (await withSplits(db, [row]))[0];
}

export async function createRun(db: Db, body: RunCreateRequest): Promise<Run> {
  const cadence = body.steps ? Math.round(body.steps / (body.duration_sec / 60)) : null;
  const terrain = analyzeProfile(body.elevation_profile);
  let id = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const res = await txn.runAsync(
      `INSERT INTO runs (planned_session_id, started_at, duration_sec, distance_m, avg_pace_sec_per_km,
         max_speed_mps, elevation_gain_m, elevation_loss_m, elevation_profile, min_altitude_m, max_altitude_m,
         uphill_distance_m, downhill_distance_m, max_grade_pct, min_grade_pct, steps, cadence_spm, route_polyline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.planned_session_id,
        toIso(body.started_at),
        body.duration_sec,
        body.distance_m,
        body.avg_pace_sec_per_km,
        body.max_speed_mps,
        body.elevation_gain_m,
        body.elevation_loss_m,
        toJson(body.elevation_profile),
        terrain.min_altitude_m,
        terrain.max_altitude_m,
        terrain.uphill_distance_m,
        terrain.downhill_distance_m,
        terrain.max_grade_pct,
        terrain.min_grade_pct,
        body.steps,
        cadence,
        body.route_polyline,
      ],
    );
    id = res.lastInsertRowId;
    for (const s of body.splits) {
      await txn.runAsync(
        'INSERT INTO run_splits (run_id, km_index, pace_sec_per_km, elevation_delta_m) VALUES (?, ?, ?, ?)',
        [id, s.km_index, s.pace_sec_per_km, s.elevation_delta_m],
      );
    }
  });
  return getRun(db, id);
}

// 최신순, 20개씩. from·to는 시간대가 붙은 ISO 시각 (to는 포함하지 않음)
export async function listRuns(
  db: Db,
  params: { from?: string; to?: string; page?: number } = {},
): Promise<Page<Run>> {
  const page = Math.max(1, params.page ?? 1);
  const where: string[] = [];
  const args: string[] = [];
  if (params.from) {
    where.push('started_at >= ?');
    args.push(toIso(params.from));
  }
  if (params.to) {
    where.push('started_at < ?');
    args.push(toIso(params.to));
  }
  const cond = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM runs ${cond}`, args))?.n ?? 0;
  const rows = await db.getAllAsync<RunRow>(
    `SELECT * FROM runs ${cond} ORDER BY started_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...args, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  return { items: await withSplits(db, rows), page, total };
}

export async function deleteRun(db: Db, id: number): Promise<void> {
  const res = await db.runAsync('DELETE FROM runs WHERE id = ?', [id]);
  if (res.changes === 0) throw new NotFoundError('러닝 기록을 찾을 수 없습니다.');
}

// 기간 합계 (횟수·거리·시간). from ≤ started_at < to
export async function summarizeRuns(db: Db, params: { from: string; to?: string }): Promise<RunTotals> {
  const args = [toIso(params.from), ...(params.to ? [toIso(params.to)] : [])];
  const row = await db.getFirstAsync<RunTotals>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(distance_m), 0) AS distance_m, COALESCE(SUM(duration_sec), 0) AS duration_sec
     FROM runs WHERE started_at >= ? ${params.to ? 'AND started_at < ?' : ''}`,
    args,
  );
  return row ?? { count: 0, distance_m: 0, duration_sec: 0 };
}

// 예측 피처용 기록 (거리 0인 기록 제외, 오래된 순)
export async function runHistory(db: Db): Promise<RunRecord[]> {
  const rows = await db.getAllAsync<{
    started_at: string;
    distance_m: number;
    duration_sec: number;
    elevation_gain_m: number | null;
  }>('SELECT started_at, distance_m, duration_sec, elevation_gain_m FROM runs WHERE distance_m > 0 ORDER BY started_at', []);
  return rows.map((r) => ({
    startedAt: new Date(r.started_at),
    distanceM: r.distance_m,
    durationSec: r.duration_sec,
    elevationGainM: r.elevation_gain_m,
  }));
}
