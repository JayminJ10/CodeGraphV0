from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_ai_service, get_db, get_embedding_service, get_graph_service
from app.models.schemas import QueryRequest, QueryResponse
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService

router = APIRouter(tags=["query"])


@router.post("/query", response_model=QueryResponse, status_code=status.HTTP_200_OK)
async def query_codebase(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    ai_service: AIService = Depends(get_ai_service),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
    graph_service: GraphService = Depends(get_graph_service),
) -> QueryResponse:
    try:
        answer, context = await ai_service.answer_question(
            db=db,
            repo_id=payload.repo_id,
            question=payload.question,
            embedding_service=embedding_service,
            graph_service=graph_service,
        )
        return QueryResponse(answer=answer, context=context)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query execution failed: {exc}",
        ) from exc
