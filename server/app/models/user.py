from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Numeric, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.types import BigIntPK


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nickname: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    profile: Mapped["UserProfile | None"] = relationship(back_populates="user", uselist=False)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    gender: Mapped[str] = mapped_column(Enum("M", "F", "OTHER", name="gender"))
    birth_year: Mapped[int] = mapped_column(SmallInteger)
    height_cm: Mapped[Decimal] = mapped_column(Numeric(5, 1))
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(5, 1))
    weekly_days: Mapped[int] = mapped_column(SmallInteger)  # 주당 운동 일수 (2–6)
    # 요일별 가능 시간(분), 예: {"mon": 30, "tue": 0, …}. NULL이면 모든 요일 60분
    availability: Mapped[dict[str, int] | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="profile")
