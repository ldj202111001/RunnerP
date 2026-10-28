"""학습한 XGBoost 모델 → 앱에 넣을 가벼운 JSON + 앱 계산이 파이썬과 같은지 확인할 검사 데이터

앱(app/src/engine/model.ts)은 XGBoost 라이브러리 없이 나무를 직접 따라가 예측합니다.
그래서 예측에 필요한 값(갈림 피처·기준값·결측 방향·잎 값)만 남겨 파일을 줄입니다.

- 입력: server/ml_models/model_v1.json, feature_list.json, model_v1_meta.json
- 출력: app/assets/model/model_v1.json (앱 번들에 포함)
        app/scripts/engine-parity.json (검사 데이터: 모델 예측·피처·지형의 파이썬 계산값)

실행: .venv\\Scripts\\python export_app_model.py
그다음: cd ..\\app; npm run check:engine  (app/src/engine이 파이썬과 같은 값을 내는지 확인)
"""

import json
import math
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "server"))
from app.services.features import RunRecord, build_features  # noqa: E402
from app.services.terrain import analyze_profile  # noqa: E402

SRC = ROOT / "server" / "ml_models"
OUT_MODEL = ROOT / "app" / "assets" / "model" / "model_v1.json"
OUT_PARITY = ROOT / "app" / "scripts" / "engine-parity.json"
DATASET = Path(__file__).parent / "data" / "dataset.csv"
N_CASES = 500
SEED = 7


def compact_tree(t: dict) -> dict:
    """노드 i: 잎이면 l[i] = -1이고 v[i]가 잎 값, 아니면 x[f[i]] < v[i] → l[i], 이상 → r[i], 결측 → d[i]가 1이면 l[i]"""
    if any(t["split_type"]) or t["categories"]:
        raise ValueError("범주형 갈림은 앱에서 지원하지 않습니다")
    left, right = t["left_children"], t["right_children"]
    is_leaf = [c == -1 for c in left]
    return {
        "l": left,
        "r": right,
        "f": [0 if leaf else f for f, leaf in zip(t["split_indices"], is_leaf)],
        "v": [float(str(np.float32(v))) for v in t["split_conditions"]],  # float32 최단 표기 (앱이 Math.fround로 복원)
        "d": [0 if leaf else int(d) for d, leaf in zip(t["default_left"], is_leaf)],
    }


def model_cases(features: list[str]) -> list[dict]:
    """실제 학습 데이터 일부 + 결측(None)이 섞인 행, XGBoost 예측 페이스"""
    df = pd.read_csv(DATASET).sample(N_CASES, random_state=SEED)[features]
    rows = df.to_numpy(dtype=float)
    rng = np.random.default_rng(SEED)
    missing = rows[:100].copy()
    for row in missing:
        for j in rng.choice(len(features), size=rng.integers(1, 4), replace=False):
            row[j] = math.nan
    rows = np.vstack([rows, missing])

    booster = xgb.Booster()
    booster.load_model(SRC / "model_v1.json")
    expected = booster.predict(xgb.DMatrix(rows, feature_names=features))
    return [
        {"x": [None if math.isnan(v) else float(v) for v in row], "pace": float(p)}
        for row, p in zip(rows, expected)
    ]


def feature_cases() -> list[dict]:
    """무작위 러닝 기록의 build_features 결과 (28일 경계·3km 미만·고도 없음·성별 섞음)"""
    rnd = random.Random(SEED)
    as_of = datetime(2026, 10, 29, 7, 0, 0)
    out = []
    for _ in range(80):
        history = []
        for _ in range(rnd.randint(0, 14)):
            dist = rnd.uniform(800, 25000)
            history.append(
                RunRecord(
                    started_at=as_of - timedelta(seconds=round(rnd.uniform(-2, 40) * 86400)),
                    distance_m=round(dist),
                    duration_sec=round(dist / 1000 * rnd.uniform(230, 520)),
                    elevation_gain_m=None if rnd.random() < 0.25 else rnd.randint(0, 300),
                )
            )
        gender = rnd.choice(["M", "F", "OTHER", None])
        target = rnd.choice([5, 10, 21.0975, 42.195])
        out.append(
            {
                "history": [
                    {
                        "started_at": r.started_at.isoformat() + "Z",
                        "distance_m": r.distance_m,
                        "duration_sec": r.duration_sec,
                        "elevation_gain_m": r.elevation_gain_m,
                    }
                    for r in history
                ],
                "as_of": as_of.isoformat() + "Z",
                "gender": gender,
                "target_distance_km": target,
                "expected": build_features(history, as_of, gender, target),
            }
        )
    return out


def terrain_cases() -> list[dict]:
    """무작위 고도 프로필의 analyze_profile 결과 (빈 프로필·1점·2점 포함)"""
    rnd = random.Random(SEED)
    profiles = [[], [12.0], [10.0, 14.5]]
    for _ in range(40):
        alt = rnd.uniform(-5, 400)
        profile = []
        for _ in range(rnd.randint(3, 80)):
            alt += rnd.uniform(-9, 9)
            profile.append(round(alt, 1))
        profiles.append(profile)
    return [{"profile": p, "expected": analyze_profile(p)} for p in profiles]


def main() -> None:
    raw = json.loads((SRC / "model_v1.json").read_text(encoding="utf-8"))
    features = json.loads((SRC / "feature_list.json").read_text(encoding="utf-8"))
    meta = json.loads((SRC / "model_v1_meta.json").read_text(encoding="utf-8"))
    learner = raw["learner"]
    if learner["objective"]["name"] != "reg:squarederror":
        raise ValueError("reg:squarederror 모델만 지원합니다")
    base_score = float(learner["learner_model_param"]["base_score"].strip("[]"))
    trees = [compact_tree(t) for t in learner["gradient_booster"]["model"]["trees"]]

    app_model = {
        "format": "xgb-trees-1",
        "version": meta["version"],
        "trained_at": meta["trained_at"],
        "features": features,
        "base_score": base_score,
        "trees": trees,
    }
    OUT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    OUT_MODEL.write_text(json.dumps(app_model, separators=(",", ":")), encoding="utf-8")

    parity = {
        "features": features,
        "model": model_cases(features),
        "feature_cases": feature_cases(),
        "terrain": terrain_cases(),
    }
    OUT_PARITY.parent.mkdir(parents=True, exist_ok=True)
    OUT_PARITY.write_text(json.dumps(parity), encoding="utf-8")

    print(f"앱 모델: {OUT_MODEL} ({OUT_MODEL.stat().st_size / 1e6:.2f} MB, 나무 {len(trees)}개)")
    print(
        f"검사 데이터: {OUT_PARITY} (모델 {len(parity['model'])}건, "
        f"피처 {len(parity['feature_cases'])}건, 지형 {len(parity['terrain'])}건)"
    )


if __name__ == "__main__":
    main()
