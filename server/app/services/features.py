"""ML 피처 정의 (학습 ml/train.py와 서버 predictor.py가 같은 함수를 씁니다)

- 입력은 runs 테이블에 있는 값만: 시작 시각, 거리, 시간, 상승 고도 (설계 원칙 5)
- 심박수·케이던스는 쓰지 않습니다. FitRec에 나이가 없어서 나이도 쓰지 않습니다.
- 표준 라이브러리만 씁니다. 서버에 pandas 없이 돌아가야 하기 때문입니다.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

WINDOW_DAYS = 28
BEST_PACE_MIN_M = 3000  # 최고 페이스는 3km 이상 러닝만

FEATURE_NAMES = [
    "dist_4w_km",
    "runs_4w",
    "avg_pace_4w",
    "best_pace_4w",
    "longest_run_4w_km",
    "elev_gain_4w_m",
    "days_since_last",
    "gender_male",
    "target_distance_km",
]


@dataclass(frozen=True)
class RunRecord:
    started_at: datetime
    distance_m: float
    duration_sec: float
    elevation_gain_m: float | None


def pace_sec_per_km(distance_m: float, duration_sec: float) -> float:
    return duration_sec / (distance_m / 1000)


def gender_male(gender: str | None) -> float | None:
    """M → 1, F → 0, 그 밖(OTHER·모름) → None (XGBoost가 결측으로 처리)"""
    return {"M": 1.0, "F": 0.0}.get(gender or "")


def build_features(
    history: list[RunRecord],
    as_of: datetime,
    gender: str | None,
    target_distance_km: float,
) -> dict[str, float | None] | None:
    """as_of 직전 28일 기록으로 피처를 만듭니다. 그 기간에 러닝이 없으면 None (콜드 스타트는 Riegel로)."""
    since = as_of - timedelta(days=WINDOW_DAYS)
    recent = [r for r in history if since <= r.started_at < as_of]
    if not recent:
        return None

    total_m = sum(r.distance_m for r in recent)
    total_sec = sum(r.duration_sec for r in recent)
    long_runs = [r for r in recent if r.distance_m >= BEST_PACE_MIN_M]
    gains = [r.elevation_gain_m for r in recent if r.elevation_gain_m is not None]
    last = max(r.started_at for r in recent)

    return {
        "dist_4w_km": total_m / 1000,
        "runs_4w": float(len(recent)),
        "avg_pace_4w": pace_sec_per_km(total_m, total_sec),
        "best_pace_4w": min(pace_sec_per_km(r.distance_m, r.duration_sec) for r in long_runs) if long_runs else None,
        "longest_run_4w_km": max(r.distance_m for r in recent) / 1000,
        "elev_gain_4w_m": sum(gains) if gains else None,
        "days_since_last": (as_of - last).total_seconds() / 86400,
        "gender_male": gender_male(gender),
        "target_distance_km": target_distance_km,
    }


def riegel_time_sec(known_distance_m: float, known_time_sec: float, target_distance_m: float) -> float:
    """Riegel 공식: T2 = T1 × (D2 / D1)^1.06 (콜드 스타트·비교 기준용)"""
    return known_time_sec * (target_distance_m / known_distance_m) ** 1.06
