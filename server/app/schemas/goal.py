from datetime import date, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

GoalType = Literal["HEALTH", "IMPROVE", "RACE"]
RACE_DISTANCES_KM = (5.0, 10.0, 21.0975, 42.195)
MIN_WEEKS_TO_RACE = 2


class GoalCreate(BaseModel):
    """POST /goals, PUT /goals/{id}. type별 필드 규칙은 설계서 3.2"""

    type: GoalType
    distance_km: float | None = None  # IMPROVE·RACE 필수
    target_time_sec: int | None = Field(default=None, gt=0, le=12 * 3600)  # 비우면 서버가 정함
    target_date: date | None = None  # RACE 필수
    weekly_minutes_target: int | None = Field(default=None, ge=30, le=1200)  # HEALTH만, 비우면 150
    recent_5k_sec: int | None = Field(default=None, ge=12 * 60, le=90 * 60)  # 콜드 스타트용

    @model_validator(mode="after")
    def _fields_match_type(self) -> "GoalCreate":
        if self.type == "HEALTH":
            if self.distance_km is not None or self.target_time_sec is not None or self.target_date is not None:
                raise ValueError("HEALTH 목표에는 distance_km, target_time_sec, target_date를 보내지 않습니다.")
            return self
        if self.weekly_minutes_target is not None:
            raise ValueError("weekly_minutes_target은 HEALTH 목표에만 씁니다.")
        if self.distance_km not in RACE_DISTANCES_KM:
            raise ValueError(f"distance_km는 {RACE_DISTANCES_KM} 중 하나여야 합니다.")
        if self.type == "IMPROVE" and self.target_date is not None:
            raise ValueError("IMPROVE 목표에는 target_date를 보내지 않습니다.")
        if self.type == "RACE":
            if self.target_date is None:
                raise ValueError("RACE 목표에는 대회 날짜(target_date)가 필요합니다.")
            if self.target_date < date.today() + timedelta(weeks=MIN_WEEKS_TO_RACE):
                raise ValueError(f"대회 날짜는 오늘부터 {MIN_WEEKS_TO_RACE}주 이후여야 합니다.")
        return self


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: GoalType
    distance_km: float | None  # HEALTH는 NULL
    target_time_sec: int | None  # HEALTH는 NULL
    target_date: date | None  # RACE만
    weekly_minutes_target: int | None  # HEALTH만
    baseline_time_sec: int | None  # 시작 시 예상 기록 (HEALTH는 5K 기준)
    status: Literal["ACTIVE", "DONE", "DROPPED"]
