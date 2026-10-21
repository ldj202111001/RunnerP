from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    gender: Literal["M", "F", "OTHER"]
    birth_year: int = Field(ge=1900, le=2100)
    height_cm: float = Field(gt=0, lt=300)
    weight_kg: float = Field(gt=0, lt=500)
    weekly_days: int = Field(ge=3, le=6)


class Me(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nickname: str
    profile: Profile | None
