from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    ai_service_shared_secret: str = ""

    # Cost controls (design doc §8.4)
    chat_max_tokens: int = 400
    classify_max_tokens: int = 100
    max_history: int = 6
    max_context_records: int = 40


@lru_cache
def get_settings() -> Settings:
    return Settings()
