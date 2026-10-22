from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SplitIn(BaseModel):
    km_index: int = Field(ge=1)
    pace_sec_per_km: int = Field(ge=0, le=32767)
    elevation_delta_m: int = Field(ge=-32768, le=32767)


class SplitOut(SplitIn):
    model_config = ConfigDict(from_attributes=True)


class RunCreate(BaseModel):
    started_at: datetime
    duration_sec: int = Field(gt=0)
    distance_m: int = Field(ge=0)
    avg_pace_sec_per_km: int = Field(ge=0, le=32767)
    max_speed_mps: float = Field(ge=0, lt=100)
    elevation_gain_m: int = Field(ge=0, le=32767)
    elevation_loss_m: int = Field(default=0, ge=0, le=32767)
    # 출발점부터 100m마다의 고도 (m). 고도를 못 얻었으면 빈 배열
    elevation_profile: list[Annotated[float, Field(ge=-1000, le=9000)]] = Field(default=[], max_length=5000)
    steps: int | None = Field(default=None, ge=0)
    route_polyline: str
    splits: list[SplitIn] = []
    planned_session_id: int | None = None

    @field_validator("started_at")
    @classmethod
    def to_naive_utc(cls, v: datetime) -> datetime:
        # DB에는 UTC 기준 naive datetime으로 저장합니다.
        return v.astimezone(UTC).replace(tzinfo=None) if v.tzinfo else v


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    planned_session_id: int | None
    started_at: datetime
    duration_sec: int
    distance_m: int
    avg_pace_sec_per_km: int
    max_speed_mps: float
    elevation_gain_m: int
    elevation_loss_m: int | None
    elevation_profile: list[float] | None
    min_altitude_m: int | None
    max_altitude_m: int | None
    uphill_distance_m: int | None
    downhill_distance_m: int | None
    max_grade_pct: float | None
    min_grade_pct: float | None
    steps: int | None
    cadence_spm: int | None
    route_polyline: str
    rpe: int | None
    completed: bool | None
    load: int | None
    memo: str | None
    splits: list[SplitOut]

    @field_validator("started_at")
    @classmethod
    def mark_utc(cls, v: datetime) -> datetime:
        # DB의 naive UTC 값을 "Z"가 붙은 시각으로 내보내 앱이 현지 시각으로 오해하지 않게 합니다.
        return v.replace(tzinfo=UTC) if v.tzinfo is None else v


class RunPage(BaseModel):
    items: list[RunOut]
    page: int
    total: int
