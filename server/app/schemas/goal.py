from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    distance_km: float
    target_time_sec: int
    target_date: date
    baseline_time_sec: int | None
    status: Literal["ACTIVE", "DONE", "DROPPED"]
