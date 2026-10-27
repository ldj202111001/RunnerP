from typing import Annotated, Literal, get_args

from pydantic import BaseModel, ConfigDict, Field, model_validator

Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
WEEKDAYS: tuple[str, ...] = get_args(Weekday)


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weekly_days: int = Field(ge=2, le=6)
    # 요일별 가능 시간(분), 예: {"mon": 30, "tue": 0, …}. 없으면 모든 요일 60분
    availability: dict[Weekday, Annotated[int, Field(ge=0, le=300)]] | None = None
    # 신체 정보는 선택 (온보딩에서 묻지 않음)
    gender: Literal["M", "F", "OTHER"] | None = None
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    height_cm: float | None = Field(default=None, gt=0, lt=300)
    weight_kg: float | None = Field(default=None, gt=0, lt=500)

    @model_validator(mode="after")
    def _days_fit_availability(self) -> "Profile":
        if self.availability is not None:
            open_days = sum(1 for weekday in WEEKDAYS if self.availability.get(weekday, 0) > 0)
            if self.weekly_days > open_days:
                raise ValueError(f"weekly_days({self.weekly_days})가 가능한 요일 수({open_days})보다 많습니다.")
        return self


class Me(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nickname: str
    profile: Profile | None
