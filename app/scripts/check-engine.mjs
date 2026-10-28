// app/src/engine이 파이썬(학습·서버)과 같은 값을 내는지 확인합니다.
// 검사 데이터 engine-parity.json은 ml/export_app_model.py가 만듭니다.
// 실행: npm run check:engine  (엔진을 scripts/.engine-check로 컴파일한 뒤 이 파일을 실행)

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = (p) => new URL(p, import.meta.url);
const { createModel, predictRaw } = require('./.engine-check/engine/model.js');
const { buildFeatures, FEATURE_NAMES } = require('./.engine-check/engine/features.js');
const { analyzeProfile } = require('./.engine-check/engine/terrain.js');

const parity = JSON.parse(readFileSync(here('./engine-parity.json'), 'utf8'));
const model = createModel(JSON.parse(readFileSync(here('../assets/model/model_v1.json'), 'utf8')));
let failed = false;

function report(name, worst, limit, count) {
  const ok = worst <= limit;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${count}건, 최대 차이 ${worst.toExponential(2)} (허용 ${limit})`);
}

// 1) 모델 예측: XGBoost가 낸 페이스(초/km)와 비교
if (FEATURE_NAMES.join() !== parity.features.join() || model.features.join() !== parity.features.join()) {
  console.log('FAIL 피처 목록이 다릅니다');
  failed = true;
}
let worst = 0;
for (const c of parity.model) {
  worst = Math.max(worst, Math.abs(predictRaw(model, c.x) - c.pace));
}
report('모델 예측 (초/km)', worst, 0.01, parity.model.length);

// 2) 피처: build_features 결과와 비교 (null 여부까지 같아야 함)
worst = 0;
for (const c of parity.feature_cases) {
  const history = c.history.map((r) => ({
    startedAt: new Date(r.started_at),
    distanceM: r.distance_m,
    durationSec: r.duration_sec,
    elevationGainM: r.elevation_gain_m,
  }));
  const got = buildFeatures(history, new Date(c.as_of), c.gender, c.target_distance_km);
  if ((got === null) !== (c.expected === null)) {
    worst = Infinity;
    continue;
  }
  if (!got) continue;
  for (const n of FEATURE_NAMES) {
    const a = got[n];
    const b = c.expected[n];
    if ((a === null) !== (b === null)) worst = Infinity;
    else if (a !== null) worst = Math.max(worst, Math.abs(a - b) / Math.max(1, Math.abs(b)));
  }
}
report('피처 (상대 오차)', worst, 1e-9, parity.feature_cases.length);

// 3) 지형: analyze_profile 결과와 비교. 반올림 방식 차이(파이썬은 .5를 짝수로)만 허용
worst = 0;
for (const c of parity.terrain) {
  const got = analyzeProfile(c.profile);
  for (const [k, b] of Object.entries(c.expected)) {
    const a = got[k];
    if ((a === null) !== (b === null)) worst = Infinity;
    else if (a !== null) worst = Math.max(worst, Math.abs(a - b) / (k.endsWith('_pct') ? 0.1 : 1));
  }
}
report('지형 (반올림 단위)', worst, 1, parity.terrain.length);

process.exit(failed ? 1 : 0);
