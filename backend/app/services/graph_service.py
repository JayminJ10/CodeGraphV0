from __future__ import annotations

import logging
from collections import defaultdict
from uuid import UUID

import networkx as nx
from sqlalchemy.orm import Session

from app.models.database import GraphSnapshot, Repository
from app.models.schemas import GraphEdge, GraphNode, GraphResponse
from app.services.parser_service import ParseOutput

logger = logging.getLogger(__name__)


class GraphService:
    USEFUL_ATOM_TYPES = {"file", "class", "function"}

    def build_graph_json(self, parse_output: ParseOutput) -> dict:
        graph = nx.DiGraph()
        symbol_index: dict[str, set[str]] = defaultdict(set)

        for atom in parse_output.atoms:
            if atom.atom_type not in self.USEFUL_ATOM_TYPES:
                continue
            label = atom.symbol or atom.atom_id
            if not self._is_useful_label(label):
                continue
            node_type = self._node_type_from_atom(atom.atom_type)
            graph.add_node(
                atom.atom_id,
                label=label,
                type=node_type,
                file_path=atom.file_path,
                metadata={
                    "atom_type": atom.atom_type,
                    "language": atom.language,
                    "concept_hint": atom.metadata.get("concept_hint"),
                },
            )
            if atom.symbol:
                symbol_index[atom.symbol].add(atom.atom_id)
                symbol_index[atom.symbol.lower()].add(atom.atom_id)

        concept_to_atoms: dict[str, list[str]] = defaultdict(list)
        for atom in parse_output.atoms:
            concept = atom.metadata.get("concept_hint")
            if concept and atom.atom_id in graph:
                concept_to_atoms[concept].append(atom.atom_id)

        for concept_name, atom_ids in concept_to_atoms.items():
            concept_id = f"concept:{concept_name}"
            graph.add_node(
                concept_id,
                label=concept_name,
                type="Concept",
                file_path=None,
                metadata={"kind": "concept"},
            )
            for atom_id in atom_ids:
                graph.add_edge(concept_id, atom_id, type="belongs_to_concept", metadata={})
            for i in range(len(atom_ids) - 1):
                graph.add_edge(atom_ids[i], atom_ids[i + 1], type="cohesion_link", metadata={})

        for rel in parse_output.relations:
            source_id = self._resolve_relation_endpoint(rel.source, graph, symbol_index)
            target_id = self._resolve_relation_endpoint(rel.target, graph, symbol_index)
            if not source_id or not target_id:
                continue
            if source_id == target_id:
                continue
            graph.add_edge(source_id, target_id, type=rel.relation_type, metadata=rel.metadata)

        # Remove isolated file nodes to avoid noise in dense repositories.
        for node_id, data in list(graph.nodes(data=True)):
            if data.get("type") == "File" and graph.degree(node_id) == 0:
                graph.remove_node(node_id)

        nodes = [
            {
                "id": node_id,
                "label": data.get("label", node_id),
                "type": data.get("type", "Module"),
                "file_path": data.get("file_path"),
                "metadata": data.get("metadata", {}),
            }
            for node_id, data in graph.nodes(data=True)
        ]
        edges = [
            {
                "source": source,
                "target": target,
                "type": data.get("type", "references"),
                "metadata": data.get("metadata", {}),
            }
            for source, target, data in graph.edges(data=True)
        ]
        return {"nodes": nodes, "edges": edges}

    def persist_graph_snapshot(self, db: Session, repo: Repository, graph_json: dict) -> GraphSnapshot:
        snapshot = db.query(GraphSnapshot).filter(GraphSnapshot.repo_id == repo.id).one_or_none()
        if snapshot is None:
            snapshot = GraphSnapshot(repo_id=repo.id, graph_json=graph_json)
        else:
            snapshot.graph_json = graph_json
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot

    def get_graph(self, db: Session, repo_id: UUID) -> GraphResponse:
        snapshot = db.query(GraphSnapshot).filter(GraphSnapshot.repo_id == repo_id).one_or_none()
        if snapshot is None:
            raise ValueError("Graph not found for repository.")

        nodes = [GraphNode(**node) for node in snapshot.graph_json.get("nodes", [])]
        edges = [GraphEdge(**edge) for edge in snapshot.graph_json.get("edges", [])]
        return GraphResponse(repo_id=repo_id, nodes=nodes, edges=edges)

    def expand_neighbors(self, graph_json: dict, seed_node_ids: list[str], max_hops: int = 1) -> set[str]:
        graph = nx.DiGraph()
        for node in graph_json.get("nodes", []):
            graph.add_node(node["id"])
        for edge in graph_json.get("edges", []):
            graph.add_edge(edge["source"], edge["target"])

        visited = set(seed_node_ids)
        frontier = set(seed_node_ids)
        for _ in range(max_hops):
            new_frontier: set[str] = set()
            for node_id in frontier:
                if node_id not in graph:
                    continue
                new_frontier.update(graph.predecessors(node_id))
                new_frontier.update(graph.successors(node_id))
            visited.update(new_frontier)
            frontier = new_frontier
        return visited

    def _node_type_from_atom(self, atom_type: str) -> str:
        return {
            "file": "File",
            "class": "Class",
            "function": "Function",
            "import": "Module",
        }.get(atom_type, "Module")

    def _resolve_relation_endpoint(self, raw_id: str, graph: nx.DiGraph, symbol_index: dict[str, set[str]]) -> str | None:
        if raw_id in graph:
            return raw_id

        if ":" not in raw_id:
            return None

        prefix, value = raw_id.split(":", maxsplit=1)
        if prefix == "module":
            # Skip unresolved external modules to avoid noisy pseudo-nodes.
            return None

        if prefix in {"function_ref", "class_ref"}:
            candidates = symbol_index.get(value) or symbol_index.get(value.lower())
            if not candidates:
                return None
            return sorted(candidates)[0]

        if prefix == "class":
            # Backward compatibility for previously emitted class:<...> relation values.
            maybe_symbol = value.split(":")[-2] if ":" in value else value
            candidates = symbol_index.get(maybe_symbol) or symbol_index.get(maybe_symbol.lower())
            if not candidates:
                return None
            return sorted(candidates)[0]

        return None

    def _is_useful_label(self, label: str) -> bool:
        cleaned = label.strip()
        if not cleaned:
            return False
        if "\n" in cleaned:
            return False
        if len(cleaned) > 140:
            return False
        return True
