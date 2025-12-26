"""Application configuration."""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # App
    APP_NAME: str = "Mosaic"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = "1066293925506-r0e8mcicmr10puu758d8i1d5hbtnu845.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "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"
    # Base URL for constructing redirect URI (e.g., https://mosaic-autumn-snow-9557.fly.dev or http://localhost:8000)
    BASE_URL: str = "http://localhost:8000"
    # Explicit redirect URI (optional, will be constructed from BASE_URL if not set)
    GOOGLE_REDIRECT_URI: str | None = None
    
    @property
    def google_redirect_uri(self) -> str:
        """Get Google OAuth redirect URI, constructing from BASE_URL if not explicitly set."""
        if self.GOOGLE_REDIRECT_URI:
            return self.GOOGLE_REDIRECT_URI
        return f"{self.BASE_URL.rstrip('/')}/api/auth/google/callback"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        # Add same-origin for production (when frontend is served from backend)
        if not any("localhost" in origin for origin in origins):
            origins.append("*")  # Or be more specific with your fly.io domain
        return origins

    # OpenAI (for embeddings)
    OPENAI_API_KEY: str
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Anthropic (for LLM analysis)
    ANTHROPIC_API_KEY: str
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # Analysis Configuration
    DBSCAN_EPS: float = 0.35
    DBSCAN_MIN_SAMPLES: int = 2
    MIN_RESPONSES_FOR_CLUSTERING: int = 3

    # Response limits
    MAX_RESPONSE_LENGTH: int = 10000

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()
