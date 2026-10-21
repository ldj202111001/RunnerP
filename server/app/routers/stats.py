from fastapi import APIRouter, Depends

from app.models import User
from app.routers._stub import not_implemented
from app.security import get_current_user

router = APIRouter(tags=["stats"])


@router.post("/predict")
def predict(user: User = Depends(get_current_user)):
    """현재 피처로 목표 종목 예상 기록 계산 (내부·디버그·발표 데모용)"""
    raise not_implemented()


@router.get("/stats/weekly")
def weekly_stats(weeks: int = 8, user: User = Depends(get_current_user)):
    """주별 거리·부하·ACWR·예상 기록 추이"""
    raise not_implemented()
