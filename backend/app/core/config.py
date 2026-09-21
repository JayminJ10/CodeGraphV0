from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CodeGraph AI"
    app_env: str = "development"
    app_debug: bool = False
    log_level: str = "INFO"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str = "postgresql+psycopg://codegraph:codegraph@localhost:5432/codegraph"

    openai_api_key: str = ""
    openai_embedding_model: str = "text-embedding-3-large"
    openai_chat_model: str = "gpt-4.1-mini"

    repo_storage_root: str = "./storage/repos"
    max_context_atoms: int = 12
    embedding_batch_size: int = 64
    embedding_max_atoms_per_repo: int = 2500
    embedding_min_content_chars: int = 24
    parse_include_test_files: bool = False
    parse_include_docs_files: bool = False
    cors_allow_origins: str = "http://localhost:5175,http://127.0.0.1:5175"
    cors_allow_origin_regex: str = r"https://.*\.vercel\.app"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def repo_storage_path(self) -> Path:
        return Path(self.repo_storage_root).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
