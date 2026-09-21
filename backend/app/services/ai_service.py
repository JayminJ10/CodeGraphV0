from __future__ import annotations

import logging
from collections import defaultdict
from uuid import UUID

from openai import AsyncOpenAI, NotFoundError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.database import CodeAtom, GraphSnapshot
from app.models.schemas import RetrievedAtom
from app.services.embedding_service import EmbeddingService
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)

    async def answer_question(
        self,
        db: Session,
        repo_id: UUID,
        question: str,
        embedding_service: EmbeddingService,
        graph_service: GraphService,
    ) -> tuple[str, list[RetrievedAtom]]:
        vector_results = await embedding_service.search_similar_atoms(db, repo_id, question, limit=16)
        if not vector_results:
            return "No indexed code was found for this repository yet.", []

        graph_snapshot = db.query(GraphSnapshot).filter(GraphSnapshot.repo_id == repo_id).one_or_none()
        graph_json = graph_snapshot.graph_json if graph_snapshot else {"nodes": [], "edges": []}

        seed_atom_ids = [result.atom.atom_id for result in vector_results]
        expanded_ids = graph_service.expand_neighbors(graph_json, seed_atom_ids, max_hops=1)

        expanded_atoms = (
            db.query(CodeAtom)
            .filter(CodeAtom.repo_id == repo_id, CodeAtom.atom_id.in_(expanded_ids))
            .all()
        )
        atom_by_id = {atom.atom_id: atom for atom in expanded_atoms}

        score_map = {r.atom.atom_id: max(r.score, 0.0) for r in vector_results}
        concept_scores: dict[str, float] = defaultdict(float)
        for atom_id, score in score_map.items():
            atom = atom_by_id.get(atom_id)
            if atom and atom.concept_name:
                concept_scores[atom.concept_name] += score

        ranked_atoms = sorted(
            atom_by_id.values(),
            key=lambda atom: (
                score_map.get(atom.atom_id, 0.2),
                concept_scores.get(atom.concept_name or "", 0.0),
            ),
            reverse=True,
        )[: self.settings.max_context_atoms]

        context_blocks = [
            (
                f"[{idx + 1}] file={atom.file_path} symbol={atom.symbol or '-'} "
                f"concept={atom.concept_name or '-'}\n{atom.content}\n"
            )
            for idx, atom in enumerate(ranked_atoms)
        ]
        context = "\n".join(context_blocks)

        intent = self._detect_intent(question)
        system_prompt = (
            "You are a senior staff engineer helping developers understand a codebase. "
            "Use the retrieved code context only, explain clearly, and cite file paths and symbols."
        )
        user_prompt = (
            f"Question intent: {intent}\n"
            f"Question: {question}\n\n"
            "Retrieved context:\n"
            f"{context}\n"
            "Provide a concise explanation with bullet points and cite files."
        )
        response = await self._create_chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
        answer = response.choices[0].message.content or "No answer generated."

        retrieved = [
            RetrievedAtom(
                atom_id=atom.atom_id,
                file_path=atom.file_path,
                symbol=atom.symbol,
                concept_name=atom.concept_name,
                score=score_map.get(atom.atom_id, 0.2),
            )
            for atom in ranked_atoms
        ]
        return answer, retrieved

    def _detect_intent(self, question: str) -> str:
        q = question.lower()
        architecture_terms = {"how does", "flow", "architecture", "work", "end-to-end"}
        if any(term in q for term in architecture_terms):
            return "architecture"
        if "where" in q or "defined" in q:
            return "pinpoint"
        return "general"

    async def _create_chat_completion(self, system_prompt: str, user_prompt: str):
        model_candidates = [
            self.settings.openai_chat_model,
            "gpt-4.1-mini",
            "gpt-4o-mini",
        ]
        last_error: Exception | None = None
        for model_name in model_candidates:
            try:
                return await self.client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                )
            except NotFoundError as exc:
                last_error = exc
                logger.warning("OpenAI model %s not available, trying fallback.", model_name)
        if last_error:
            raise last_error
        raise RuntimeError("Failed to generate chat completion.")
