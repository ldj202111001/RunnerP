from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, Numeric, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.types import BigIntPK, LongText


class Run(Base):
    __tablename__ = "runs"
    __table_args__ = (Index("ix_runs_user_started", "user_id", "started_at"),)

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("users.id", ondelete="CASCADE"))
    # 계획 없이 뛴 러닝은 NULL
    planned_session_id: Mapped[int | None] = mapped_column(
        BigIntPK, ForeignKey("planned_sessions.id", ondelete="SET NULL")
    )
    started_at: Mapped[datetime] = mapped_column(DateTime)
    duration_sec: Mapped[int] = mapped_column(Integer)
    distance_m: Mapped[int] = mapped_column(Integer)
    avg_pace_sec_per_km: Mapped[int] = mapped_column(SmallInteger)
    max_speed_mps: Mapped[Decimal] = mapped_column(Numeric(4, 2))
    elevation_gain_m: Mapped[int] = mapped_column(SmallInteger)
    elevation_loss_m: Mapped[int | None] = mapped_column(SmallInteger)
    # 출발점부터 100m마다의 고도 (m). 아래 지형 값은 이 프로필로 서버가 계산 (services/terrain.py)
    elevation_profile: Mapped[list[Any] | None] = mapped_column(JSON)
    min_altitude_m: Mapped[int | None] = mapped_column(SmallInteger)
    max_altitude_m: Mapped[int | None] = mapped_column(SmallInteger)
    uphill_distance_m: Mapped[int | None] = mapped_column(Integer)  # 경사 +3% 이상
    downhill_distance_m: Mapped[int | None] = mapped_column(Integer)  # 경사 -3% 이하
    max_grade_pct: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))  # 가장 가파른 오르막
    min_grade_pct: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))  # 가장 가파른 내리막
    steps: Mapped[int | None] = mapped_column(Integer)
    cadence_spm: Mapped[int | None] = mapped_column(SmallInteger)
    route_polyline: Mapped[str] = mapped_column(LongText)
    # 결과 입력(PATCH /runs/{id}/feedback) 시 채움
    rpe: Mapped[int | None] = mapped_column(SmallInteger)
    completed: Mapped[bool | None] = mapped_column(Boolean)
    load: Mapped[int | None] = mapped_column(SmallInteger)  # sRPE = duration_min × rpe
    memo: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    splits: Mapped[list["RunSplit"]] = relationship(
        back_populates="run", cascade="all, delete-orphan", order_by="RunSplit.km_index"
    )


class RunSplit(Base):
    """1km 구간 기록"""

    __tablename__ = "run_splits"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    km_index: Mapped[int] = mapped_column(SmallInteger)
    pace_sec_per_km: Mapped[int] = mapped_column(SmallInteger)  # 페이스 급락 감지에 사용
    elevation_delta_m: Mapped[int] = mapped_column(SmallInteger)

    run: Mapped[Run] = relationship(back_populates="splits")
