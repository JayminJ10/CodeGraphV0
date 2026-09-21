from collections.abc import Generator

from sqlalchemy.orm import Session

from app.models.database import SessionLocal
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService
from app.services.parser_service import ParserService
from app.services.repo_service import RepoService


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_repo_service() -> RepoService:
    return RepoService()


def get_parser_service() -> ParserService:
    return ParserService()


def get_graph_service() -> GraphService:
    return GraphService()


def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()


def get_ai_service() -> AIService:
    return AIService()
