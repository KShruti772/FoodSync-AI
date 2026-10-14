from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "FoodSync AI API"
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5433/foodsync_db",
        validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_DATABASE_URL"),
    )
    DB_ECHO: bool = False
    SECRET_KEY: str = Field(
        default="foodsync-dev-secret-key-change-me-for-production-2026",
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"),
    )
    ALGORITHM: str = Field(
        default="HS256",
        validation_alias=AliasChoices("ALGORITHM", "JWT_ALGORITHM"),
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    CLIENT_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
