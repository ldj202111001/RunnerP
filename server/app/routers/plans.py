from fastapi import APIRouter, Depends

from app.models import User
from app.routers._stub import not_implemented
from app.security import get_current_user

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("/today")
def get_today(user: User = Depends(get_current_user)):
    """오늘의 훈련 1건 + 이유 (없으면 휴식일)"""
    raise not_implemented()


@router.get("/week")
def get_week(start: str, user: User = Depends(get_current_user)):
    """해당 주 7일 계획 + 80/20 비율 + ACWR"""
    raise not_implemented()


@router.post("/regenerate")
def regenerate(user: User = Depends(get_current_user)):
    """수동 재계획 (일정 변경 시)"""
    raise not_implemented()
