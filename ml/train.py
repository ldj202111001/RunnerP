"""data/runs.csv → 학습 데이터 → 모델 비교 → server/ml_models/에 저장

학습 샘플 하나 = "어떤 러닝" 1건:
- 입력: 그 러닝 직전 28일 기록으로 만든 피처 (server/app/services/features.py)
- 정답: 그 러닝의 평균 페이스 (초/km), target_distance_km = 그 러닝의 거리
같은 사람이 학습·평가에 섞이지 않도록 사용자 단위로 나눕니다 (처음 보는 사용자에 대한 성능).

실행: .venv\\Scripts\\python train.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "server"))
from app.services.features import FEATURE_NAMES, RunRecord, build_features  # noqa: E402

DATA = Path(__file__).parent / "data"
MODEL_DIR = ROOT / "server" / "ml_models"
MODEL_VERSION = "v1"
SEED = 42


def build_dataset(runs: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for user_id, g in runs.sort_values("started_at").groupby("user_id"):
        records = [
            RunRecord(
                started_at=r.started_at.to_pydatetime(),
                distance_m=r.distance_m,
                duration_sec=r.duration_sec,
                elevation_gain_m=None if pd.isna(r.elevation_gain_m) else r.elevation_gain_m,
            )
            for r in g.itertuples()
        ]
        gender = g["gender"].iloc[0]
        for i, target in enumerate(records):
            # 28일 창 밖의 기록은 build_features가 걸러 주므로 앞쪽 기록을 그대로 넘깁니다.
            feats = build_features(records[max(0, i - 200) : i], target.started_at, gender, target.distance_m / 1000)
            if feats is None:
                continue
            feats["user_id"] = user_id
            feats["target_pace"] = target.duration_sec / (target.distance_m / 1000)
            rows.append(feats)
    return pd.DataFrame(rows)


def riegel_baseline(x: pd.DataFrame) -> np.ndarray:
    """비교 기준: 최근 28일 평균 페이스를 평균 거리에서 목표 거리로 Riegel 환산"""
    avg_dist = x["dist_4w_km"] / x["runs_4w"]
    return (x["avg_pace_4w"] * (x["target_distance_km"] / avg_dist) ** 0.06).to_numpy()


def evaluate(name: str, y: np.ndarray, pred: np.ndarray) -> dict:
    m = {"model": name, "mae": float(mean_absolute_error(y, pred)), "rmse": float(root_mean_squared_error(y, pred))}
    print(f"{name:<18} MAE {m['mae']:6.1f}초/km   RMSE {m['rmse']:6.1f}초/km")
    return m


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows 콘솔에서 한글이 깨지지 않게
    runs = pd.read_csv(DATA / "runs.csv", parse_dates=["started_at"])
    print(f"러닝 {len(runs):,}건 / 사용자 {runs['user_id'].nunique():,}명")

    data = build_dataset(runs)
    data.to_csv(DATA / "dataset.csv", index=False)
    print(f"학습 샘플 {len(data):,}개 (직전 28일 기록이 있는 러닝)")

    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    train_idx, test_idx = next(split.split(data, groups=data["user_id"]))
    train, test = data.iloc[train_idx], data.iloc[test_idx]
    x_train, y_train = train[FEATURE_NAMES], train["target_pace"].to_numpy()
    x_test, y_test = test[FEATURE_NAMES], test["target_pace"].to_numpy()
    print(f"학습 {len(train):,} / 평가 {len(test):,} (사용자 단위 분리)\n")

    results = [evaluate("Riegel 기준선", y_test, riegel_baseline(x_test))]

    linear = make_pipeline(SimpleImputer(strategy="median"), LinearRegression()).fit(x_train, y_train)
    results.append(evaluate("선형회귀", y_test, linear.predict(x_test)))

    forest = make_pipeline(
        SimpleImputer(strategy="median"),
        RandomForestRegressor(n_estimators=300, min_samples_leaf=5, n_jobs=-1, random_state=SEED),
    ).fit(x_train, y_train)
    results.append(evaluate("랜덤포레스트", y_test, forest.predict(x_test)))

    booster = xgb.XGBRegressor(
        n_estimators=600,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=SEED,
    ).fit(x_train, y_train)
    results.append(evaluate("XGBoost", y_test, booster.predict(x_test)))

    # 서버는 XGBoost 모델을 씁니다. 파이썬 버전과 상관없는 XGBoost 자체 형식(JSON)으로 저장합니다.
    MODEL_DIR.mkdir(exist_ok=True)
    booster.save_model(MODEL_DIR / f"model_{MODEL_VERSION}.json")
    (MODEL_DIR / "feature_list.json").write_text(json.dumps(FEATURE_NAMES, indent=2), encoding="utf-8")
    importance = dict(zip(FEATURE_NAMES, map(float, booster.feature_importances_)))
    meta = {
        "version": MODEL_VERSION,
        "trained_at": datetime.now().isoformat(timespec="seconds"),
        "xgboost": xgb.__version__,
        "train_samples": len(train),
        "test_samples": len(test),
        "metrics_sec_per_km": results,
        "feature_importance": importance,
    }
    (MODEL_DIR / f"model_{MODEL_VERSION}_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("\n피처 중요도:", {k: round(v, 3) for k, v in sorted(importance.items(), key=lambda kv: -kv[1])})
    print(f"→ {MODEL_DIR}")


if __name__ == "__main__":
    main()
