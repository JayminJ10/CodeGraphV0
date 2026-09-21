from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class AnalyzeRepoRequest(BaseModel):
    repo_url: HttpUrl


class AnalyzeRepoResponse(BaseModel):
    repo_id: UUID
    repo_url: str
    status: str
    message: str


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    file_path: str | None = None
    metadata: dict = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str
    metadata: dict = Field(default_factory=dict)


class GraphResponse(BaseModel):
    repo_id: UUID
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class QueryRequest(BaseModel):
    repo_id: UUID
    question: str = Field(min_length=3, max_length=2000)


class RetrievedAtom(BaseModel):
    atom_id: str
    file_path: str
    symbol: str | None = None
    concept_name: str | None = None
    score: float


class QueryResponse(BaseModel):
    answer: str
    context: list[RetrievedAtom]


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    repo_url: str
    name: str
    local_path: str
    status: str
    created_at: datetime
    updated_at: datetime | None = None
