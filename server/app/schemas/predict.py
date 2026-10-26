from typing import Literal

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    # 비우면 진행 중 목표의 거리
    distance_km: float | None = Field(default=None, gt=0, le=100)
    # 최근 28일 기록이 없을 때 쓰는 최근 5K 기록 (초)
    recent_5k_sec: int | None = Field(default=None, gt=0, le=4 * 3600)


class PredictOut(BaseModel):
    distance_km: float
    predicted_time_sec: int
    predicted_pace_sec_per_km: int
    method: Literal["model", "riegel_5k", "riegel_last_run"]  # model = XGBoost, 나머지는 Riegel 대체
    model_version: str | None
    features: dict[str, float | None] | None
