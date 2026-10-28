// 폰 SQLite 테이블 (설계서 4절의 서버 DB를 폰 단독으로 옮김).
// 기기 1대 = 사용자 1명이라 users 테이블과 user_id가 없고, 프로필은 한 줄(id = 1)뿐입니다.
// 시각은 UTC ISO 문자열('2026-10-28T22:10:00.000Z')로 저장해 문자열 비교로 기간을 거릅니다.
// JSON 값(availability, elevation_profile, features_json)은 TEXT에 JSON으로 넣습니다.

import type { Db } from './sqlite';

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

// 버전별 변경. 출시 후에는 이미 있는 단계를 고치지 말고 새 단계를 뒤에 더합니다.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    weekly_days INTEGER NOT NULL CHECK (weekly_days BETWEEN 2 AND 6),
    availability TEXT,
    gender TEXT CHECK (gender IN ('M', 'F', 'OTHER')),
    birth_year INTEGER,
    height_cm REAL,
    weight_kg REAL,
    updated_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('HEALTH', 'IMPROVE', 'RACE')),
    distance_km REAL,
    target_time_sec INTEGER,
    target_date TEXT,
    weekly_minutes_target INTEGER,
    baseline_time_sec INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DONE', 'DROPPED')),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE UNIQUE INDEX goals_one_active ON goals (status) WHERE status = 'ACTIVE';

  CREATE TABLE weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'BASE'
      CHECK (phase IN ('BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY', 'MAINTAIN')),
    target_load INTEGER NOT NULL,
    target_distance_km REAL NOT NULL,
    acwr_at_creation REAL,
    easy_ratio REAL NOT NULL,
    reason TEXT NOT NULL,
    version INTEGER NOT NULL,
    is_current INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW},
    UNIQUE (goal_id, week_start, version)
  );

  CREATE TABLE planned_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weekly_plan_id INTEGER NOT NULL REFERENCES weekly_plans (id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EASY', 'LONG', 'TEMPO', 'INTERVAL', 'REST')),
    distance_km REAL NOT NULL,
    target_pace_sec_per_km INTEGER NOT NULL,
    target_rpe INTEGER NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'DONE', 'MISSED')),
    condition INTEGER,
    downgraded INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planned_session_id INTEGER REFERENCES planned_sessions (id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    distance_m INTEGER NOT NULL,
    avg_pace_sec_per_km INTEGER NOT NULL,
    max_speed_mps REAL NOT NULL,
    elevation_gain_m INTEGER NOT NULL,
    elevation_loss_m INTEGER,
    elevation_profile TEXT,
    min_altitude_m INTEGER,
    max_altitude_m INTEGER,
    uphill_distance_m INTEGER,
    downhill_distance_m INTEGER,
    max_grade_pct REAL,
    min_grade_pct REAL,
    steps INTEGER,
    cadence_spm INTEGER,
    route_polyline TEXT NOT NULL,
    rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
    completed INTEGER,
    load INTEGER,
    memo TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX runs_started_at ON runs (started_at);

  CREATE TABLE run_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
    km_index INTEGER NOT NULL,
    pace_sec_per_km INTEGER NOT NULL,
    elevation_delta_m INTEGER NOT NULL,
    UNIQUE (run_id, km_index)
  );

  CREATE TABLE predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES runs (id) ON DELETE SET NULL,
    predicted_time_sec INTEGER NOT NULL,
    model_version TEXT NOT NULL,
    features_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX predictions_goal ON predictions (goal_id, created_at);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

// 연결할 때마다 부르는 설정과, 아직 적용 안 된 단계만 순서대로 적용
export async function migrate(db: Db): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[v]);
      await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
