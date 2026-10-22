"""코스 지형 분석 — 앱이 보낸 100m 간격 고도 프로필로 고도 범위와 경사를 계산합니다.

경사(%) = 100m 사이 고도차 ÷ 100m × 100. 센서 잡음 때문에 3점 이동평균으로 고른 뒤 계산합니다.
결과는 runs 테이블 컬럼으로 저장되어 ML 피처·훈련 강도 계산에 쓸 수 있습니다.
"""

from typing import Any

PROFILE_INTERVAL_M = 100  # 앱 src/sensors/summary.ts의 PROFILE_INTERVAL_M과 같아야 함
HILL_GRADE_PCT = 3.0  # 이 이상 오르면 오르막, 이 이상 내려가면 내리막으로 셈
GRADE_LIMIT_PCT = 999.9  # DB DECIMAL(4,1) 범위


def _smooth(profile: list[float]) -> list[float]:
    if len(profile) < 3:
        return list(profile)
    inner = [(profile[i - 1] + profile[i] + profile[i + 1]) / 3 for i in range(1, len(profile) - 1)]
    return [profile[0], *inner, profile[-1]]


def _clamp_grade(grade: float) -> float:
    return round(max(-GRADE_LIMIT_PCT, min(GRADE_LIMIT_PCT, grade)), 1)


def analyze_profile(profile: list[float]) -> dict[str, Any]:
    """runs 테이블의 지형 컬럼 값. 고도가 없으면 전부 None, 지점이 1개뿐이면 경사 값만 None."""
    result: dict[str, Any] = dict.fromkeys(
        ("min_altitude_m", "max_altitude_m", "uphill_distance_m", "downhill_distance_m", "max_grade_pct", "min_grade_pct")
    )
    if not profile:
        return result
    result.update(min_altitude_m=round(min(profile)), max_altitude_m=round(max(profile)))
    if len(profile) < 2:
        return result

    smoothed = _smooth(profile)
    grades = [(b - a) / PROFILE_INTERVAL_M * 100 for a, b in zip(smoothed, smoothed[1:])]
    result.update(
        uphill_distance_m=sum(PROFILE_INTERVAL_M for g in grades if g >= HILL_GRADE_PCT),
        downhill_distance_m=sum(PROFILE_INTERVAL_M for g in grades if g <= -HILL_GRADE_PCT),
        max_grade_pct=_clamp_grade(max(grades)),
        min_grade_pct=_clamp_grade(min(grades)),
    )
    return result
