from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.database import CodeAtom, CodeEmbedding, Repository
from app.utils.chunking import CodeChunk

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    atom: CodeAtom
    score: float


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)

    async def persist_atoms_and_embeddings(self, db: Session, repo: Repository, chunks: list[CodeChunk]) -> None:
        db.execute(delete(CodeEmbedding).where(CodeEmbedding.atom_id.in_(db.query(CodeAtom.id).filter(CodeAtom.repo_id == repo.id))))
        db.execute(delete(CodeAtom).where(CodeAtom.repo_id == repo.id))
        db.commit()

        atoms: list[CodeAtom] = []
        for chunk in chunks:
            atom = CodeAtom(
                repo_id=repo.id,
                atom_id=chunk.atom_id,
                atom_type=chunk.atom_type,
                symbol=chunk.symbol,
                file_path=chunk.file_path,
                module_path=chunk.module_path,
                language=chunk.language,
                content=chunk.content,
                start_line=chunk.start_line,
                end_line=chunk.end_line,
                metadata_json=chunk.metadata,
                concept_name=chunk.metadata.get("concept_hint"),
            )
            atoms.append(atom)

        db.add_all(atoms)
        db.commit()

        eligible_atoms = [atom for atom in atoms if self._should_embed_atom(atom)]
        eligible_atoms = self._select_atoms_for_embedding(eligible_atoms)
        logger.info(
            "[embeddings] repo_id=%s eligible_atoms=%s total_atoms=%s batch_size=%s",
            repo.id,
            len(eligible_atoms),
            len(atoms),
            self.settings.embedding_batch_size,
        )

        vectors = await self._embed_atoms_batched(eligible_atoms)

        embeddings = [CodeEmbedding(atom_id=atom.id, vector=vector) for atom, vector in zip(eligible_atoms, vectors, strict=False)]
        db.add_all(embeddings)
        db.commit()

    async def search_similar_atoms(self, db: Session, repo_id: UUID, question: str, limit: int = 8) -> list[RetrievalResult]:
        q_vector = await self._embed_text(question)
        rows = (
            db.query(CodeAtom, CodeEmbedding.vector.cosine_distance(q_vector).label("distance"))
            .join(CodeEmbedding, CodeEmbedding.atom_id == CodeAtom.id)
            .filter(CodeAtom.repo_id == repo_id)
            .order_by("distance")
            .limit(limit)
            .all()
        )
        return [RetrievalResult(atom=row[0], score=1.0 - float(row[1])) for row in rows]

    async def _embed_atoms_batched(self, atoms: list[CodeAtom]) -> list[list[float]]:
        if not atoms:
            return []

        vectors: list[list[float]] = []
        batch_size = max(1, self.settings.embedding_batch_size)
        total = len(atoms)

        for start in range(0, total, batch_size):
            batch = atoms[start : start + batch_size]
            inputs = [atom.content[:8000] for atom in batch]
            response = await self.client.embeddings.create(
                model=self.settings.openai_embedding_model,
                input=inputs,
            )
            vectors.extend(item.embedding for item in response.data)
            logger.info(
                "[embeddings] progress=%s/%s batches_done=%s",
                min(start + len(batch), total),
                total,
                (start // batch_size) + 1,
            )
        return vectors

    async def _embed_text(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(
            model=self.settings.openai_embedding_model,
            input=text[:8000],
        )
        return response.data[0].embedding

    def _should_embed_atom(self, atom: CodeAtom) -> bool:
        if atom.atom_type in {"file", "import"}:
            return False
        if len(atom.content.strip()) < self.settings.embedding_min_content_chars:
            return False
        return True

    def _select_atoms_for_embedding(self, atoms: list[CodeAtom]) -> list[CodeAtom]:
        if len(atoms) <= self.settings.embedding_max_atoms_per_repo:
            return atoms

        priority = {"class": 0, "function": 1, "import": 2}
        sorted_atoms = sorted(
            atoms,
            key=lambda atom: (
                priority.get(atom.atom_type, 3),
                len(atom.content),
            ),
            reverse=False,
        )
        capped = sorted_atoms[: self.settings.embedding_max_atoms_per_repo]
        logger.warning(
            "[embeddings] atom cap applied selected=%s dropped=%s",
            len(capped),
            len(atoms) - len(capped),
        )
        return capped
