from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    get_embedding_service,
    get_graph_service,
    get_parser_service,
    get_repo_service,
)
from app.models.database import Repository, RepositoryStatus
from app.models.schemas import AnalyzeRepoRequest, AnalyzeRepoResponse, GraphResponse
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService
from app.services.parser_service import ParserService
from app.services.repo_service import RepoService

router = APIRouter(prefix="/repos", tags=["repositories"])
logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=AnalyzeRepoResponse, status_code=status.HTTP_202_ACCEPTED)
async def analyze_repository(
    payload: AnalyzeRepoRequest,
    db: Session = Depends(get_db),
    repo_service: RepoService = Depends(get_repo_service),
    parser_service: ParserService = Depends(get_parser_service),
    graph_service: GraphService = Depends(get_graph_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> AnalyzeRepoResponse:
    repo_url = str(payload.repo_url)
    try:
        logger.info("[analyze][step=1] Received analyze request url=%s", repo_url)
        repo_service.validate_repo_url(repo_url)
        repo = repo_service.get_or_create_repository(db, repo_url)
        repo_service.set_status(db, repo, RepositoryStatus.processing)
        logger.info("[analyze][step=2] Repository record ready repo_id=%s", repo.id)

        local_repo_path = await asyncio.to_thread(repo_service.clone_repository, repo)
        logger.info("[analyze][step=3] Clone complete path=%s", local_repo_path)
        parse_output = await asyncio.to_thread(parser_service.parse_repository, local_repo_path)
        logger.info(
            "[analyze][step=4] Parse complete atoms=%s relations=%s",
            len(parse_output.atoms),
            len(parse_output.relations),
        )

        graph_json = graph_service.build_graph_json(parse_output)
        graph_service.persist_graph_snapshot(db, repo, graph_json)
        logger.info(
            "[analyze][step=5] Graph persisted nodes=%s edges=%s",
            len(graph_json.get("nodes", [])),
            len(graph_json.get("edges", [])),
        )

        await embedding_service.persist_atoms_and_embeddings(db, repo, parse_output.atoms)
        logger.info("[analyze][step=6] Embeddings persisted count=%s", len(parse_output.atoms))
        repo_service.set_status(db, repo, RepositoryStatus.ready)
        logger.info("[analyze][step=7] Analysis complete repo_id=%s", repo.id)

        return AnalyzeRepoResponse(
            repo_id=repo.id,
            repo_url=repo.repo_url,
            status=RepositoryStatus.ready.value,
            message="Repository analyzed successfully.",
        )
    except Exception as exc:
        logger.exception("Repository analysis failed for %s", repo_url)
        db.rollback()
        maybe_repo: Repository | None = db.query(Repository).filter(Repository.repo_url == repo_url).one_or_none()
        if maybe_repo:
            repo_service.set_status(db, maybe_repo, RepositoryStatus.failed, str(exc))
            repo_id = maybe_repo.id
        else:
            repo_id = UUID(int=0)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "repo_id": str(repo_id),
                "error": "Failed to analyze repository.",
                "reason": str(exc),
            },
        ) from exc


@router.get("/{repo_id}/graph", response_model=GraphResponse)
async def get_repository_graph(
    repo_id: UUID,
    db: Session = Depends(get_db),
    graph_service: GraphService = Depends(get_graph_service),
) -> GraphResponse:
    try:
        return graph_service.get_graph(db, repo_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
