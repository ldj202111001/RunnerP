// ML: 성과 예측 (이 앱에서 ML이 쓰이는 유일한 곳, 계획 배분은 planner의 규칙)
// - 앱에 포함한 모델(assets/model/model_v1.json)로 목표 거리 예상 기록을 계산합니다.
// - 최근 28일 기록이 없으면 Riegel 공식으로 대체 (콜드 스타트): 입력한 최근 5K 기록 → 마지막 러닝 순

import { buildFeatures, FEATURE_NAMES, riegelTimeSec, type Features, type Gender, type RunRecord } from './features';
import { createModel, predictRaw, type Model, type ModelFile } from './model';

// 학습 데이터 범위(ml/preprocess.py)를 벗어난 예측은 이 안으로 자릅니다.
const MIN_PACE = 150;
const MAX_PACE = 900;

export interface PredictionResult {
  distanceKm: number;
  predictedTimeSec: number;
  method: 'model' | 'riegel_5k' | 'riegel_last_run';
  modelVersion: string | null; // 'xgb_v1' (모델을 썼을 때만)
  features: Features | null; // 모델을 썼을 때만
}

let bundled: Model | null = null;

// 1.4MB 모델을 처음 예측할 때 한 번만 읽습니다.
export function bundledModel(): Model {
  if (!bundled) {
    const file: ModelFile = require('../../assets/model/model_v1.json');
    bundled = createModel(file);
    if (bundled.features.join() !== FEATURE_NAMES.join()) {
      throw new Error(`모델 피처 목록이 앱과 다릅니다: ${bundled.features.join(', ')}`);
    }
  }
  return bundled;
}

// 검사(scripts/check-db.mjs)처럼 앱 번들 밖에서 돌릴 때 파일에서 읽은 모델을 넣습니다.
export function setModel(model: Model): void {
  bundled = model;
}

export function predictPace(model: Model, features: Features): number {
  const pace = predictRaw(
    model,
    FEATURE_NAMES.map((n) => features[n]),
  );
  return Math.min(Math.max(pace, MIN_PACE), MAX_PACE);
}

// 목표 거리 예상 기록. 근거가 전혀 없으면(기록도 5K 입력도 없음) null
export function predictWith(
  model: Model,
  history: RunRecord[],
  gender: Gender | null,
  distanceKm: number,
  asOf: Date,
  recent5kSec?: number | null,
): PredictionResult | null {
  const features = buildFeatures(history, asOf, gender, distanceKm);
  if (features) {
    return {
      distanceKm,
      predictedTimeSec: Math.round(predictPace(model, features) * distanceKm),
      method: 'model',
      modelVersion: `xgb_${model.version}`,
      features,
    };
  }

  const targetM = distanceKm * 1000;
  if (recent5kSec) {
    return {
      distanceKm,
      predictedTimeSec: Math.round(riegelTimeSec(5000, recent5kSec, targetM)),
      method: 'riegel_5k',
      modelVersion: null,
      features: null,
    };
  }
  const past = history.filter((r) => r.startedAt.getTime() < asOf.getTime());
  if (past.length) {
    const last = past.reduce((a, b) => (b.startedAt.getTime() > a.startedAt.getTime() ? b : a));
    return {
      distanceKm,
      predictedTimeSec: Math.round(riegelTimeSec(last.distanceM, last.durationSec, targetM)),
      method: 'riegel_last_run',
      modelVersion: null,
      features: null,
    };
  }
  return null;
}

export function predict(
  history: RunRecord[],
  gender: Gender | null,
  distanceKm: number,
  asOf: Date = new Date(),
  recent5kSec?: number | null,
): PredictionResult | null {
  return predictWith(bundledModel(), history, gender, distanceKm, asOf, recent5kSec);
}

export function predictedPaceSecPerKm(result: PredictionResult): number {
  return Math.round(result.predictedTimeSec / result.distanceKm);
}
