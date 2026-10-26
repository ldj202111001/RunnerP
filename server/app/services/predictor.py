"""ML: 성과 예측 (이 프로젝트에서 ML이 쓰이는 유일한 곳)

- 서버 시작 시 ml_models/model_v1.json(XGBoost) + feature_list.json 로드
- runs 테이블로 피처 계산 (services/features.py, 학습과 같은 함수) → 목표 종목 예상 기록
- 최근 28일 기록이 없으면 Riegel 공식으로 대체 (콜드 스타트): 입력한 최근 5K 기록 → 마지막 러닝 순
"""

import json
import logging
import math
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import numpy as np
import xgboost as xgb
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Run, User
from app.services.features import FEATURE_NAMES, RunRecord, build_features, riegel_time_sec

log = logging.getLogger(__name__)

SERVER_DIR = Path(__file__).resolve().parents[2]
# 학습 데이터 범위(ml/preprocess.py)를 벗어난 예측은 이 안으로 자릅니다.
MIN_PACE = 150
MAX_PACE = 900

_model: xgb.Booster | None = None
_model_version: str | None = None


def is_loaded() -> bool:
    return _model is not None


def model_version() -> str | None:
    return _model_version


def load() -> None:
    """모델 파일을 불러옵니다. 없거나 피처 목록이 다르면 경고만 남기고 Riegel 대체로 동작합니다."""
    global _model, _model_version
    path = SERVER_DIR / settings.model_path
    features_path = path.parent / "feature_list.json"
    try:
        trained_features = json.loads(features_path.read_text(encoding="utf-8"))
        if trained_features != FEATURE_NAMES:
            raise ValueError(f"피처 목록이 다릅니다: 모델 {trained_features} / 서버 {FEATURE_NAMES}")
        booster = xgb.Booster()
        booster.load_model(path)
    except Exception as e:  # 모델이 없어도 서버는 떠야 합니다.
        log.warning("예측 모델을 불러오지 못했습니다 (%s): %s", path, e)
        _model, _model_version = None, None
        return
    _model = booster
    _model_version = f"xgb_{path.stem.removeprefix('model_')}"  # model_v1.json → xgb_v1
    log.info("예측 모델 로드: %s", _model_version)


@dataclass
class PredictionResult:
    distance_km: float
    predicted_time_sec: int
    method: Literal["model", "riegel_5k", "riegel_last_run"]
    model_version: str | None
    features: dict[str, float | None] | None  # 모델을 썼을 때만

    @property
    def predicted_pace_sec_per_km(self) -> int:
        return round(self.predicted_time_sec / self.distance_km)


def predict(
    history: list[RunRecord],
    gender: str | None,
    distance_km: float,
    as_of: datetime,
    recent_5k_sec: int | None = None,
) -> PredictionResult | None:
    """목표 거리 예상 기록. 근거가 전혀 없으면(기록도 5K 입력도 없음) None"""
    features = build_features(history, as_of, gender, distance_km)
    if features is not None and _model is not None:
        row = np.array([[math.nan if features[n] is None else features[n] for n in FEATURE_NAMES]], dtype=float)
        pace = float(_model.predict(xgb.DMatrix(row, feature_names=FEATURE_NAMES))[0])
        pace = min(max(pace, MIN_PACE), MAX_PACE)
        return PredictionResult(distance_km, round(pace * distance_km), "model", _model_version, features)

    target_m = distance_km * 1000
    if recent_5k_sec:
        return PredictionResult(
            distance_km, round(riegel_time_sec(5000, recent_5k_sec, target_m)), "riegel_5k", None, None
        )
    past = [r for r in history if r.started_at < as_of]
    if past:
        last = max(past, key=lambda r: r.started_at)
        return PredictionResult(
            distance_km,
            round(riegel_time_sec(last.distance_m, last.duration_sec, target_m)),
            "riegel_last_run",
            None,
            None,
        )
    return None


def user_history(db: Session, user_id: int) -> list[RunRecord]:
    runs = db.scalars(
        select(Run).where(Run.user_id == user_id, Run.distance_m > 0).order_by(Run.started_at)
    ).all()
    return [
        RunRecord(
            started_at=r.started_at,
            distance_m=r.distance_m,
            duration_sec=r.duration_sec,
            elevation_gain_m=r.elevation_gain_m,
        )
        for r in runs
    ]


def predict_for_user(
    db: Session, user: User, distance_km: float, recent_5k_sec: int | None = None
) -> PredictionResult | None:
    """DB의 러닝 기록과 프로필 성별로 지금 시점의 예상 기록 (runs.started_at은 UTC naive)"""
    gender = user.profile.gender if user.profile else None
    return predict(user_history(db, user.id), gender, distance_km, datetime.now(UTC).replace(tzinfo=None), recent_5k_sec)
