from datetime import UTC, date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import Goal, PlannedSession, Run, RunSplit, User, WeeklyPlan
from app.routers._stub import not_implemented
from app.schemas.run import RunCreate, RunOut, RunPage, RunSummary
from app.security import get_current_user
from app.services.terrain import analyze_profile

router = APIRouter(prefix="/runs", tags=["runs"])

PAGE_SIZE = 20


def _get_own_run(db: Session, user: User, run_id: int) -> Run:
    run = db.scalar(
        select(Run).where(Run.id == run_id, Run.user_id == user.id).options(selectinload(Run.splits))
    )
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "러닝 기록을 찾을 수 없습니다.")
    return run


@router.post("", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def create_run(body: RunCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """러닝 저장 (요약값 + 폴리라인 + 1km 구간 + 100m 고도 프로필)"""
    if body.planned_session_id is not None:
        owned = db.scalar(
            select(PlannedSession.id)
            .join(WeeklyPlan, PlannedSession.weekly_plan_id == WeeklyPlan.id)
            .join(Goal, WeeklyPlan.goal_id == Goal.id)
            .where(PlannedSession.id == body.planned_session_id, Goal.user_id == user.id)
        )
        if owned is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "계획된 훈련을 찾을 수 없습니다.")

    cadence = round(body.steps / (body.duration_sec / 60)) if body.steps else None
    run = Run(
        user_id=user.id,
        cadence_spm=cadence,
        **body.model_dump(exclude={"splits"}),
        **analyze_profile(body.elevation_profile),
        splits=[RunSplit(**s.model_dump()) for s in body.splits],
    )
    db.add(run)
    db.commit()
    return run


@router.patch("/{run_id}/feedback")
def submit_feedback(run_id: int, user: User = Depends(get_current_user)):
    """결과 입력 → 재조정 트리거
    a. load 저장  b. 피로 신호(fatigue)  c. 재예측(predictor)  d. 계획 재조정(planner)  e. 응답
    """
    raise not_implemented()


@router.get("", response_model=RunPage)
def list_runs(
    from_: date | None = Query(default=None, alias="from"),
    to: date | None = None,
    page: int = Query(default=1, ge=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """러닝 목록 (최신순, ?from=&to=&page=)"""
    conditions = [Run.user_id == user.id]
    if from_ is not None:
        conditions.append(Run.started_at >= datetime.combine(from_, time.min))
    if to is not None:
        conditions.append(Run.started_at < datetime.combine(to + timedelta(days=1), time.min))

    total = db.scalar(select(func.count()).select_from(Run).where(*conditions)) or 0
    runs = db.scalars(
        select(Run)
        .where(*conditions)
        .options(selectinload(Run.splits))
        .order_by(Run.started_at.desc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
    ).all()
    return RunPage(items=[RunOut.model_validate(r) for r in runs], page=page, total=total)


def _naive_utc(v: datetime) -> datetime:
    return v.astimezone(UTC).replace(tzinfo=None) if v.tzinfo else v


@router.get("/summary", response_model=RunSummary)
def summarize_runs(
    from_: datetime = Query(alias="from"),
    to: datetime | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """기간 합계 (횟수·거리·시간). from ≤ started_at < to, 시각은 시간대 포함 ISO 8601
    앱이 현지 기준 "이번 달"을 구하도록 날짜가 아니라 시각을 받습니다."""
    conditions = [Run.user_id == user.id, Run.started_at >= _naive_utc(from_)]
    if to is not None:
        conditions.append(Run.started_at < _naive_utc(to))
    count, distance, duration = db.execute(
        select(func.count(), func.coalesce(func.sum(Run.distance_m), 0), func.coalesce(func.sum(Run.duration_sec), 0))
        .where(*conditions)
    ).one()
    return RunSummary(count=count, distance_m=distance, duration_sec=duration)


@router.get("/{run_id}", response_model=RunOut)
def get_run(run_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """러닝 상세 (경로·구간 페이스 포함)"""
    return _get_own_run(db, user, run_id)


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(run_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """러닝 삭제 (잘못 측정한 기록). 1km 구간도 함께 지워집니다."""
    db.delete(_get_own_run(db, user, run_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
