from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Goal, User
from app.routers._stub import not_implemented
from app.schemas.predict import PredictOut, PredictRequest
from app.security import get_current_user
from app.services import predictor

router = APIRouter(tags=["stats"])


@router.post("/predict", response_model=PredictOut)
def predict(body: PredictRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """현재 피처로 목표 종목 예상 기록 계산 (내부·디버그·발표 데모용). 이력은 저장하지 않습니다."""
    distance_km = body.distance_km
    if distance_km is None:
        goal = db.scalar(select(Goal).where(Goal.user_id == user.id, Goal.status == "ACTIVE"))
        if goal is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "distance_km를 보내거나 목표를 먼저 설정하세요.")
        distance_km = float(goal.distance_km)

    result = predictor.predict_for_user(db, user, distance_km, body.recent_5k_sec)
    if result is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "러닝 기록이 없습니다. 최근 5K 기록(recent_5k_sec)을 보내 주세요."
        )
    return PredictOut(
        distance_km=result.distance_km,
        predicted_time_sec=result.predicted_time_sec,
        predicted_pace_sec_per_km=result.predicted_pace_sec_per_km,
        method=result.method,
        model_version=result.model_version,
        features=result.features,
    )


@router.get("/stats/weekly")
def weekly_stats(weeks: int = 8, user: User = Depends(get_current_user)):
    """주별 거리·부하·ACWR·예상 기록 추이"""
    raise not_implemented()
