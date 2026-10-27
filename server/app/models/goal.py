from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, SmallInteger, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import BigIntPK


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # 목적 유형: planner 수치 묶음을 고름 (설계서 5.3)
    type: Mapped[str] = mapped_column(Enum("HEALTH", "IMPROVE", "RACE", name="goal_type"))
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))  # 5 / 10 / 21.0975 / 42.195. HEALTH는 NULL
    target_time_sec: Mapped[int | None] = mapped_column(Integer)  # HEALTH는 NULL
    target_date: Mapped[date | None] = mapped_column(Date)  # 대회 날짜. RACE만
    weekly_minutes_target: Mapped[int | None] = mapped_column(SmallInteger)  # 주당 목표 시간(분). HEALTH만
    baseline_time_sec: Mapped[int | None] = mapped_column(Integer)  # 시작 시 예측/입력 기록 (HEALTH는 5K 기준)
    # 사용자당 ACTIVE는 1개 (서비스 코드에서 보장)
    status: Mapped[str] = mapped_column(Enum("ACTIVE", "DONE", "DROPPED", name="goal_status"), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
