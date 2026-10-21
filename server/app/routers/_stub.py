from fastapi import HTTPException, status


def not_implemented() -> HTTPException:
    """뼈대 단계: 경로만 열어 두고 아직 구현하지 않은 API"""
    return HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "아직 구현되지 않은 API입니다.")
