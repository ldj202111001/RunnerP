from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import BigIntPK


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    distance_km: Mapped[Decimal] = mapped_column(Numeric(6, 4))  # 5 / 10 / 21.0975 / 42.195
    target_time_sec: Mapped[int] = mapped_column(Integer)
    target_date: Mapped[date] = mapped_column(Date)
    baseline_time_sec: Mapped[int | None] = mapped_column(Integer)  # 시작 시 예측/입력 기록
    # 사용자당 ACTIVE는 1개 (서비스 코드에서 보장)
    status: Mapped[str] = mapped_column(Enum("ACTIVE", "DONE", "DROPPED", name="goal_status"), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
