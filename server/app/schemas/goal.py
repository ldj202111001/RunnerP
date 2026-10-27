from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict

GoalType = Literal["HEALTH", "IMPROVE", "RACE"]


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: GoalType
    distance_km: float | None  # HEALTH는 NULL
    target_time_sec: int | None  # HEALTH는 NULL
    target_date: date | None  # RACE만
    weekly_minutes_target: int | None  # HEALTH만
    baseline_time_sec: int | None
    status: Literal["ACTIVE", "DONE", "DROPPED"]
