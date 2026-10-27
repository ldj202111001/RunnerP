from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Goal, Prediction, User
from app.routers._stub import not_implemented
from app.schemas.goal import GoalCreate, GoalOut
from app.security import get_current_user
from app.services import predictor

router = APIRouter(prefix="/goals", tags=["goals"])

# 기본값 (설계서 7절)
DEFAULT_WEEKLY_MINUTES = 150  # HEALTH 주간 목표 시간, WHO 권고
UNKNOWN_5K_SEC = 35 * 60  # 기록도 5K 입력도 없을 때 시작값
TARGET_RATIO = 0.95  # 목표 기록을 비우면 현재 예상 기록보다 5% 빠르게
HEALTH_REFERENCE_KM = 5.0  # HEALTH는 거리가 없으므로 5K로 예측 (페이스 구간 계산용)


def _apply(goal: Goal, body: GoalCreate, user: User, db: Session) -> None:
    """요청 값을 목표에 채우고, 시작 예측을 baseline과 predictions에 남깁니다."""
    distance_km = body.distance_km or HEALTH_REFERENCE_KM
    result = predictor.predict_for_user(db, user, distance_km, body.recent_5k_sec) or predictor.predict_for_user(
        db, user, distance_km, UNKNOWN_5K_SEC
    )
    assert result is not None  # 5K 시작값을 주면 Riegel로 항상 예측됨

    goal.type = body.type
    goal.distance_km = body.distance_km
    goal.target_date = body.target_date
    goal.baseline_time_sec = result.predicted_time_sec
    if body.type == "HEALTH":
        goal.weekly_minutes_target = body.weekly_minutes_target or DEFAULT_WEEKLY_MINUTES
        goal.target_time_sec = None
    else:
        goal.weekly_minutes_target = None
        goal.target_time_sec = body.target_time_sec or round(result.predicted_time_sec * TARGET_RATIO)
    db.flush()

    db.add(
        Prediction(
            user_id=user.id,
            goal_id=goal.id,
            predicted_time_sec=result.predicted_time_sec,
            model_version=result.model_version or result.method,
            features_json=result.features or {},
        )
    )
    # 첫 주간 계획은 planner 구현 후 여기서 생성 (설계서 5.2 ①)


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(body: GoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """목표 생성 → 초기 예측(predictor). 기존 ACTIVE 목표는 DROPPED"""
    db.execute(update(Goal).where(Goal.user_id == user.id, Goal.status == "ACTIVE").values(status="DROPPED"))
    goal = Goal(user_id=user.id, status="ACTIVE")
    db.add(goal)
    _apply(goal, body, user, db)
    db.commit()
    return goal


@router.get("/current", response_model=GoalOut)
def get_current_goal(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """진행 중 목표. 없으면 404 → 앱은 S1 목표 설정으로 이동"""
    goal = db.scalar(select(Goal).where(Goal.user_id == user.id, Goal.status == "ACTIVE"))
    if goal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "진행 중인 목표가 없습니다.")
    return goal


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, body: GoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """목표 수정 → 다시 예측 (planner 구현 후 계획 재생성)"""
    goal = db.get(Goal, goal_id)
    if goal is None or goal.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "목표를 찾을 수 없습니다.")
    if goal.status != "ACTIVE":
        raise HTTPException(status.HTTP_409_CONFLICT, "진행 중인 목표만 수정할 수 있습니다.")
    _apply(goal, body, user, db)
    db.commit()
    return goal


@router.get("/current/progress")
def get_progress(user: User = Depends(get_current_user)):
    """유형별 진행률 (설계서 3.2)"""
    raise not_implemented()
