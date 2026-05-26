"""
MANAS Backend Configuration
Central configuration using pydantic-settings for environment variable support.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables or defaults."""

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./manas.db"

    # JWT
    JWT_SECRET_KEY: str = "manas-secret-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # App
    APP_TITLE: str = "MANAS API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # OTP (Phase 1: simulated)
    OTP_EXPIRY_MINUTES: int = 5

    # AI Settings (Phase 2)
    GROQ_API_KEY: Optional[str] = None
    AI_PROVIDER: str = "groq"  # "groq" | "local" | "mock"
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    LOCAL_LLM_MODEL: str = "google/flan-t5-base"

    # Twilio WhatsApp
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None

    # WhatsApp AI assistant
    WHATSAPP_DB_PATH: str = "whatsapp_assistant.db"
    MAX_MEMORY_MESSAGES: int = 8
    ENABLE_HEAVY_MODELS: bool = False
    EMOTION_MODEL: str = "j-hartmann/emotion-english-distilroberta-base"
    INDIC_TO_EN_MODEL: str = "ai4bharat/indictrans2-indic-en-1B"
    EN_TO_INDIC_MODEL: str = "ai4bharat/indictrans2-en-indic-1B"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str) and value.lower() in {"release", "prod", "production"}:
            return False
        return value


settings = Settings()

