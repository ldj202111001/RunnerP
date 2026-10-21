from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import BigIntPK


class Prediction(Base):
    """예측 이력 (진행률 그래프용)"""

    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    goal_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[int | None] = mapped_column(BigIntPK, ForeignKey("runs.id", ondelete="SET NULL"))
    predicted_time_sec: Mapped[int] = mapped_column(Integer)
    model_version: Mapped[str] = mapped_column(String(20))  # 예: xgb_v1
    features_json: Mapped[dict[str, Any]] = mapped_column(JSON)  # 입력 피처 스냅샷
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
