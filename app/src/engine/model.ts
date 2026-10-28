// ML 모델 실행: 학습한 XGBoost 나무들을 라이브러리 없이 직접 따라가 페이스(초/km)를 예측합니다.
// 모델 파일은 ml/export_app_model.py가 만듭니다 (assets/model/model_v1.json).
// XGBoost처럼 입력값과 기준값을 float32로 맞춰 비교해야 파이썬 예측과 같은 나무 가지를 탑니다.

export interface ModelFile {
  format: 'xgb-trees-1';
  version: string;
  trained_at: string;
  features: string[];
  base_score: number;
  // 노드 i: 잎이면 l[i] = -1이고 v[i]가 잎 값, 아니면 x[f[i]] < v[i] → l[i], 이상 → r[i], 결측 → d[i]가 1이면 l[i]
  trees: { l: number[]; r: number[]; f: number[]; v: number[]; d: number[] }[];
}

interface Tree {
  left: Int32Array;
  right: Int32Array;
  feature: Int32Array;
  value: Float32Array;
  defaultLeft: Uint8Array;
}

export interface Model {
  version: string;
  features: string[];
  baseScore: number;
  trees: Tree[];
}

export function createModel(file: ModelFile): Model {
  if (file.format !== 'xgb-trees-1') {
    throw new Error(`지원하지 않는 모델 형식: ${file.format}`);
  }
  return {
    version: file.version,
    features: file.features,
    baseScore: file.base_score,
    trees: file.trees.map((t) => ({
      left: Int32Array.from(t.l),
      right: Int32Array.from(t.r),
      feature: Int32Array.from(t.f),
      value: Float32Array.from(t.v),
      defaultLeft: Uint8Array.from(t.d),
    })),
  };
}

// x는 model.features 순서. null은 결측(나무마다 정해진 방향으로 감)
export function predictRaw(model: Model, x: (number | null)[]): number {
  const input = x.map((v) => (v == null || Number.isNaN(v) ? null : Math.fround(v)));
  let sum = 0;
  for (const t of model.trees) {
    let node = 0;
    while (t.left[node] !== -1) {
      const v = input[t.feature[node]];
      const goLeft = v == null ? t.defaultLeft[node] === 1 : v < t.value[node];
      node = goLeft ? t.left[node] : t.right[node];
    }
    sum += t.value[node];
  }
  return model.baseScore + sum;
}
