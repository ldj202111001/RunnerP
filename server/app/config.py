from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # 예: mysql+pymysql://runner:비밀번호@localhost:3306/runner_planner
    # MySQL 설치 전에는 sqlite:///./dev.db 로 개발할 수 있습니다.
    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7
    model_path: str = "ml_models/model_v1.pkl"


settings = Settings()
