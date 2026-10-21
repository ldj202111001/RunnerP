"""ML: 성과 예측 (이 프로젝트에서 ML이 쓰이는 유일한 곳)

- 서버 시작 시 ml_models/model_v1.pkl + feature_list.json 로드
- runs 테이블로 피처 계산 (ml/features.py와 같은 정의) → 목표 종목 예상 기록
- 러닝 기록이 없으면 최근 5K 기록 + Riegel 공식으로 대체 (콜드 스타트)
"""

_model = None
_model_version: str | None = None


def is_loaded() -> bool:
    return _model is not None


def model_version() -> str | None:
    return _model_version
