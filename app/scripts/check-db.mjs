// 폰 DB 함수(app/src/db)를 Node 내장 SQLite로 검사합니다. 앱의 expo-sqlite와 같은 SQLite라 SQL·규칙을 그대로 확인할 수 있습니다.
// 실행: npm run check:db  (src/engine·src/db를 scripts/.engine-check로 컴파일한 뒤 이 파일을 실행)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const out = './.engine-check';
const { createModel } = require(`${out}/engine/model.js`);
const { predictWith, setModel } = require(`${out}/engine/predictor.js`);
const { riegelTimeSec } = require(`${out}/engine/features.js`);
const { analyzeProfile } = require(`${out}/engine/terrain.js`);
const { NotFoundError, ValidationError } = require(`${out}/db/sqlite.js`);
const { migrate, SCHEMA_VERSION } = require(`${out}/db/schema.js`);
const { getProfile, updateProfile } = require(`${out}/db/profile.js`);
const { createRun, deleteRun, getRun, listRuns, runHistory, summarizeRuns, PAGE_SIZE } = require(`${out}/db/runs.js`);
const { createGoal, currentGoal, updateGoal } = require(`${out}/db/goals.js`);

const model = createModel(JSON.parse(readFileSync(new URL('../assets/model/model_v1.json', import.meta.url), 'utf8')));
setModel(model);

// expo-sqlite의 SQLiteDatabase와 같은 모양 (src/db/sqlite.ts의 Db)
function wrap(raw) {
  const db = {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params) {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    // node:sqlite는 프로토타입 없는 객체를 주므로 expo-sqlite처럼 일반 객체로 바꿉니다.
    async getFirstAsync(sql, params) {
      const row = raw.prepare(sql).get(...params);
      return row ? { ...row } : null;
    },
    async getAllAsync(sql, params) {
      return raw.prepare(sql).all(...params).map((row) => ({ ...row }));
    },
    async withExclusiveTransactionAsync(task) {
      raw.exec('BEGIN EXCLUSIVE');
      try {
        await task(db);
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db;
}

const raw = new DatabaseSync(':memory:');
const db = wrap(raw);
const count = (table) => raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`OK   ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}\n     ${e.stack ?? e}`);
    process.exitCode = 1;
  }
}

function runBody(startedAt, distanceM, durationSec, extra = {}) {
  return {
    started_at: startedAt,
    duration_sec: durationSec,
    distance_m: distanceM,
    avg_pace_sec_per_km: Math.round(durationSec / (distanceM / 1000)),
    max_speed_mps: 3.4,
    elevation_gain_m: 18,
    elevation_loss_m: 17,
    elevation_profile: [14, 15.2, 16.8, 15.1, 13.9, 12.5],
    steps: 5046,
    route_polyline: 'gfo}EtohhU',
    splits: [
      { km_index: 1, pace_sec_per_km: 338, elevation_delta_m: 2 },
      { km_index: 2, pace_sec_per_km: 387, elevation_delta_m: -1 },
    ],
    planned_session_id: null,
    ...extra,
  };
}

await check('마이그레이션: 두 번 실행해도 같은 버전', async () => {
  await migrate(db);
  await migrate(db);
  assert.equal(raw.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
  assert.equal(raw.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  for (const t of ['profile', 'goals', 'weekly_plans', 'planned_sessions', 'runs', 'run_splits', 'predictions']) count(t);
});

await check('프로필: 없음 → 만들기 → 보낸 필드만 바꾸기', async () => {
  assert.equal(await getProfile(db), null);
  await updateProfile(db, { weekly_days: 3 });
  await updateProfile(db, { weekly_days: 3, gender: 'M', height_cm: 172.5 });
  const p = await updateProfile(db, { weekly_days: 4 });
  assert.deepEqual(p, {
    weekly_days: 4,
    availability: null,
    gender: 'M',
    birth_year: null,
    height_cm: 172.5,
    weight_kg: null,
  });
  assert.equal(count('profile'), 1);
});

await check('프로필: 잘못된 값은 ValidationError, 저장 안 됨', async () => {
  await assert.rejects(updateProfile(db, { weekly_days: 7 }), ValidationError);
  await assert.rejects(
    updateProfile(db, { weekly_days: 4, availability: { mon: 60, wed: 30, sat: 0 } }),
    /가능한 요일 수\(2일\)/,
  );
  assert.equal((await getProfile(db)).weekly_days, 4);
  const p = await updateProfile(db, { weekly_days: 2, availability: { mon: 60, wed: 30 } });
  assert.deepEqual(p.availability, { mon: 60, wed: 30 });
});

let firstGoal;
await check('목표: 기록 없음 + 최근 5K → Riegel 예측, 목표 = 95%', async () => {
  firstGoal = await createGoal(db, { type: 'IMPROVE', distance_km: 10, recent_5k_sec: 1500 });
  const baseline = Math.round(riegelTimeSec(5000, 1500, 10000));
  assert.equal(firstGoal.baseline_time_sec, baseline);
  assert.equal(firstGoal.target_time_sec, Math.round(baseline * 0.95));
  assert.equal(firstGoal.status, 'ACTIVE');
  const pred = raw.prepare('SELECT * FROM predictions WHERE goal_id = ?').get(firstGoal.id);
  assert.equal(pred.model_version, 'riegel_5k');
});

await check('목표: 5K 기록도 없으면 35분 가정', async () => {
  const g = await createGoal(db, { type: 'HEALTH' });
  assert.equal(g.baseline_time_sec, 35 * 60);
  assert.equal(g.weekly_minutes_target, 150);
  assert.equal(g.distance_km, null);
  assert.equal(g.target_time_sec, null);
});

let runId;
await check('러닝 저장: 지형·케이던스 계산, 1km 구간', async () => {
  const run = await createRun(db, runBody('2026-10-28T07:10:00+09:00', 4920, 1802));
  runId = run.id;
  assert.equal(run.started_at, '2026-10-27T22:10:00.000Z');
  assert.equal(run.cadence_spm, Math.round(5046 / (1802 / 60)));
  const t = analyzeProfile([14, 15.2, 16.8, 15.1, 13.9, 12.5]);
  for (const k of Object.keys(t)) assert.equal(run[k], t[k], k);
  assert.deepEqual(run.elevation_profile, [14, 15.2, 16.8, 15.1, 13.9, 12.5]);
  assert.equal(run.splits.length, 2);
  assert.equal(run.completed, null);
  assert.deepEqual(await getRun(db, run.id), run);
});

await check('러닝 목록: 최신순 20개씩, 기간 합계', async () => {
  for (let i = 0; i < 24; i++) {
    const day = String(1 + i).padStart(2, '0');
    await createRun(db, runBody(`2026-09-${day}T06:00:00Z`, 3000 + i * 100, 1100 + i * 30, { splits: [] }));
  }
  const p1 = await listRuns(db, { page: 1 });
  const p2 = await listRuns(db, { page: 2 });
  assert.equal(p1.total, 25);
  assert.equal(p1.items.length, PAGE_SIZE);
  assert.equal(p2.items.length, 5);
  assert.equal(p1.items[0].id, runId);
  assert.ok(p1.items[1].started_at > p1.items[2].started_at);
  const oct = await summarizeRuns(db, { from: '2026-10-01T00:00:00+09:00' });
  assert.deepEqual(oct, { count: 1, distance_m: 4920, duration_sec: 1802 });
  const sep = await summarizeRuns(db, { from: '2026-09-01T00:00:00Z', to: '2026-10-01T00:00:00Z' });
  assert.equal(sep.count, 24);
  assert.equal((await listRuns(db, { from: '2026-09-20T00:00:00Z', to: '2026-09-22T00:00:00Z' })).total, 2);
});

await check('목표: 최근 기록이 있으면 모델 예측, 이전 목표는 DROPPED', async () => {
  const now = new Date('2026-10-29T00:00:00Z');
  const g = await createGoal(db, { type: 'IMPROVE', distance_km: 10 }, now);
  const expected = predictWith(model, await runHistory(db), 'M', 10, now);
  assert.equal(expected.method, 'model');
  assert.equal(g.baseline_time_sec, expected.predictedTimeSec);
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM goals WHERE status = 'ACTIVE'").get().n, 1);
  assert.equal((await currentGoal(db)).id, g.id);
  const pred = raw.prepare('SELECT * FROM predictions WHERE goal_id = ?').get(g.id);
  assert.equal(pred.model_version, 'xgb_v1');
  assert.equal(JSON.parse(pred.features_json).gender_male, 1);
});

await check('목표: 입력 검사 (대회 날짜·종목·종류별 필드)', async () => {
  const now = new Date('2026-10-29T09:00:00+09:00');
  await assert.rejects(createGoal(db, { type: 'RACE', distance_km: 10, target_date: '2026-11-05' }, now), /2주 이후/);
  await assert.rejects(createGoal(db, { type: 'IMPROVE', distance_km: 7 }, now), ValidationError);
  await assert.rejects(createGoal(db, { type: 'HEALTH', recent_5k_sec: 60 }, now), ValidationError);
  const race = await createGoal(db, { type: 'RACE', distance_km: 21.0975, target_date: '2026-11-12' }, now);
  assert.equal(race.target_date, '2026-11-12');
  const edited = await updateGoal(db, race.id, { type: 'RACE', distance_km: 10, target_date: '2026-12-20' }, now);
  assert.equal(edited.distance_km, 10);
  await assert.rejects(updateGoal(db, firstGoal.id, { type: 'HEALTH' }, now), /진행 중인 목표만/);
  await assert.rejects(updateGoal(db, 9999, { type: 'HEALTH' }, now), NotFoundError);
});

await check('러닝 삭제: 1km 구간도 함께, 없는 id는 NotFoundError', async () => {
  const before = count('run_splits');
  await deleteRun(db, runId);
  assert.equal(count('run_splits'), before - 2);
  await assert.rejects(getRun(db, runId), NotFoundError);
  await assert.rejects(deleteRun(db, runId), NotFoundError);
});

await check('거래 묶음: 중간에 실패하면 러닝도 저장 안 됨', async () => {
  const before = count('runs');
  const dup = [
    { km_index: 1, pace_sec_per_km: 300, elevation_delta_m: 0 },
    { km_index: 1, pace_sec_per_km: 300, elevation_delta_m: 0 },
  ];
  await assert.rejects(createRun(db, runBody('2026-10-29T06:00:00Z', 2000, 700, { splits: dup })));
  assert.equal(count('runs'), before);
});

console.log(`\n${passed}개 통과${process.exitCode ? ', 실패 있음' : ''}`);
