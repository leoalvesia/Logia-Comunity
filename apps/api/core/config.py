from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Logia Business Community API"
    environment: str = "development"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://logia:logia_dev_password@localhost:5432/logia"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Resend (email)
    resend_api_key: str = ""
    resend_from: str = "noreply@logiabusiness.com.br"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""  # monthly subscription price ID (price_xxx)
    frontend_url: str = "http://localhost:3000"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Rate limiting
    rate_limit_per_minute: int = 100


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
