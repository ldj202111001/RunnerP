from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Goal, User
from app.routers._stub import not_implemented
from app.schemas.goal import GoalOut
from app.security import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("")
def create_goal(user: User = Depends(get_current_user)):
    """목표 생성 → 초기 예측(predictor) + 첫 주간 계획(planner) 생성"""
    raise not_implemented()


@router.get("/current", response_model=GoalOut)
def get_current_goal(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """진행 중 목표. 없으면 404 → 앱은 S1 목표 설정으로 이동"""
    goal = db.scalar(select(Goal).where(Goal.user_id == user.id, Goal.status == "ACTIVE"))
    if goal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "진행 중인 목표가 없습니다.")
    return goal


@router.put("/{goal_id}")
def update_goal(goal_id: int, user: User = Depends(get_current_user)):
    """목표 수정 → 계획 재생성"""
    raise not_implemented()


@router.get("/current/progress")
def get_progress(user: User = Depends(get_current_user)):
    """목표 기록 대비 최신 예측 기록, 남은 주 수"""
    raise not_implemented()
