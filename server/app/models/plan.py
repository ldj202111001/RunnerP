import datetime as dt
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.types import BigIntPK


class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    goal_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    week_start: Mapped[dt.date] = mapped_column(Date)  # 월요일
    target_load: Mapped[int] = mapped_column(SmallInteger)  # ACWR로 결정한 주간 부하
    target_distance_km: Mapped[Decimal] = mapped_column(Numeric(5, 1))
    acwr_at_creation: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))  # 기록 4주 미만이면 NULL
    # 훈련 단계 (설계서 5.3 4). HEALTH는 MAINTAIN
    phase: Mapped[str] = mapped_column(
        Enum("BASE", "BUILD", "PEAK", "TAPER", "RECOVERY", "MAINTAIN", name="plan_phase")
    )
    easy_ratio: Mapped[Decimal] = mapped_column(Numeric(3, 2))  # HEALTH 0.90, 그 외 0.80
    reason: Mapped[str] = mapped_column(String(255))
    version: Mapped[int] = mapped_column(SmallInteger, default=1)  # 재조정 시 +1 (이력 보존)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())

    sessions: Mapped[list["PlannedSession"]] = relationship(
        back_populates="weekly_plan", cascade="all, delete-orphan", order_by="PlannedSession.date"
    )


class PlannedSession(Base):
    __tablename__ = "planned_sessions"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    weekly_plan_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("weekly_plans.id", ondelete="CASCADE"), index=True)
    date: Mapped[dt.date] = mapped_column(Date)
    # EASY·LONG = 저강도, TEMPO·INTERVAL = 고강도
    type: Mapped[str] = mapped_column(Enum("EASY", "LONG", "TEMPO", "INTERVAL", "REST", name="session_type"))
    distance_km: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    target_pace_sec_per_km: Mapped[int] = mapped_column(SmallInteger)
    target_rpe: Mapped[int] = mapped_column(SmallInteger)
    description: Mapped[str] = mapped_column(String(255))  # 예: "400m × 6, 휴식 90초"
    status: Mapped[str] = mapped_column(
        Enum("PLANNED", "DONE", "MISSED", name="session_status"), default="PLANNED"
    )
    condition: Mapped[int | None] = mapped_column(SmallInteger)  # 출발 전 컨디션 1–5 (선택 기능)
    downgraded: Mapped[bool] = mapped_column(Boolean, default=False)  # 컨디션 때문에 한 단계 낮췄는지

    weekly_plan: Mapped[WeeklyPlan] = relationship(back_populates="sessions")
