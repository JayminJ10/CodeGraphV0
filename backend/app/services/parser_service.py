from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from tree_sitter import Node
from tree_sitter_languages import get_parser

from app.core.config import get_settings
from app.utils.chunking import CodeChunk, trim_content

logger = logging.getLogger(__name__)


@dataclass
class ParsedRelation:
    source: str
    target: str
    relation_type: str
    metadata: dict


@dataclass
class ParseOutput:
    atoms: list[CodeChunk]
    relations: list[ParsedRelation]


class ParserService:
    EXT_LANGUAGE = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
    }

    SKIP_DIRS = {
        ".git",
        "node_modules",
        "venv",
        ".venv",
        "__pycache__",
        "dist",
        "build",
        ".next",
        "coverage",
        "target",
    }

    def __init__(self) -> None:
        self.settings = get_settings()
        try:
            self.parsers = {
                "python": get_parser("python"),
                "javascript": get_parser("javascript"),
                "typescript": get_parser("typescript"),
            }
        except Exception as exc:
            raise RuntimeError(
                "Failed to initialize tree-sitter parsers. "
                "Check tree-sitter package compatibility."
            ) from exc

    def parse_repository(self, repo_root: Path) -> ParseOutput:
        atoms: list[CodeChunk] = []
        relations: list[ParsedRelation] = []

        for file_path in repo_root.rglob("*"):
            if not file_path.is_file():
                continue
            language = self.EXT_LANGUAGE.get(file_path.suffix.lower())
            if not language:
                continue
            if any(part in self.SKIP_DIRS for part in file_path.parts):
                continue
            normalized = str(file_path.relative_to(repo_root)).replace("\\", "/").lower()
            if not self.settings.parse_include_test_files and "/tests/" in f"/{normalized}/":
                continue
            if not self.settings.parse_include_docs_files and (
                normalized.startswith("docs/") or "/docs/" in normalized
            ):
                continue

            file_atoms, file_relations = self._parse_file(repo_root, file_path, language)
            atoms.extend(file_atoms)
            relations.extend(file_relations)

        return ParseOutput(atoms=atoms, relations=relations)

    def _parse_file(self, repo_root: Path, file_path: Path, language: str) -> tuple[list[CodeChunk], list[ParsedRelation]]:
        parser = self.parsers[language]
        source = file_path.read_bytes()
        tree = parser.parse(source)
        rel_path = str(file_path.relative_to(repo_root)).replace("\\", "/")
        module_name = rel_path.rsplit(".", maxsplit=1)[0].replace("/", ".")

        atoms: list[CodeChunk] = [
            CodeChunk(
                atom_id=f"file:{rel_path}",
                atom_type="file",
                symbol=rel_path,
                file_path=rel_path,
                module_path=module_name,
                language=language,
                content=trim_content(source.decode("utf-8", errors="ignore")),
                start_line=1,
                end_line=None,
                metadata={"node_type": "file"},
            )
        ]
        relations: list[ParsedRelation] = []

        for node in self._walk(tree.root_node):
            if language == "python":
                self._handle_python_node(node, source, rel_path, module_name, atoms, relations)
            else:
                self._handle_js_ts_node(node, source, rel_path, module_name, atoms, relations)

        return atoms, relations

    def _handle_python_node(
        self,
        node: Node,
        source: bytes,
        rel_path: str,
        module_name: str,
        atoms: list[CodeChunk],
        relations: list[ParsedRelation],
    ) -> None:
        if node.type in {"function_definition", "class_definition"}:
            name_node = node.child_by_field_name("name")
            if not name_node:
                return
            symbol = self._node_text(name_node, source)
            atom_type = "function" if node.type == "function_definition" else "class"
            atom_id = f"{atom_type}:{rel_path}:{symbol}:{node.start_point[0] + 1}"
            content = self._node_text(node, source)
            concept = self._infer_concept(symbol, rel_path, content)
            atoms.append(
                CodeChunk(
                    atom_id=atom_id,
                    atom_type=atom_type,
                    symbol=symbol,
                    file_path=rel_path,
                    module_path=module_name,
                    language="python",
                    content=trim_content(content),
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    metadata={"node_type": node.type, "concept_hint": concept},
                )
            )
            relations.append(
                ParsedRelation(
                    source=f"file:{rel_path}",
                    target=atom_id,
                    relation_type="references",
                    metadata={"reason": "declares"},
                )
            )

            if atom_type == "class":
                for child in node.children:
                    if child.type == "argument_list":
                        for base in child.children:
                            base_name = self._node_text(base, source).strip()
                            if base_name and base_name not in {"(", ")", ","}:
                                relations.append(
                                    ParsedRelation(
                                        source=atom_id,
                                        target=f"class_ref:{base_name}",
                                        relation_type="inherits",
                                        metadata={"base_class": base_name},
                                    )
                                )

        if node.type in {"import_statement", "import_from_statement"}:
            import_text = self._node_text(node, source).replace("\n", " ").strip()
            target = f"module:{import_text}"
            import_atom_id = f"import:{rel_path}:{node.start_point[0] + 1}"
            atoms.append(
                CodeChunk(
                    atom_id=import_atom_id,
                    atom_type="import",
                    symbol=import_text,
                    file_path=rel_path,
                    module_path=module_name,
                    language="python",
                    content=import_text,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    metadata={"node_type": node.type},
                )
            )
            relations.append(
                ParsedRelation(
                    source=f"file:{rel_path}",
                    target=target,
                    relation_type="imports",
                    metadata={"statement": import_text},
                )
            )

        if node.type == "call":
            fn = node.child_by_field_name("function")
            if fn:
                called = self._node_text(fn, source).strip()
                if called:
                    relations.append(
                        ParsedRelation(
                            source=f"file:{rel_path}",
                            target=f"function_ref:{called}",
                            relation_type="calls",
                            metadata={"callee": called},
                        )
                    )

    def _handle_js_ts_node(
        self,
        node: Node,
        source: bytes,
        rel_path: str,
        module_name: str,
        atoms: list[CodeChunk],
        relations: list[ParsedRelation],
    ) -> None:
        if node.type in {"class_declaration", "function_declaration", "method_definition"}:
            name_node = node.child_by_field_name("name")
            if not name_node and node.type == "method_definition":
                name_node = node.child_by_field_name("property")
            if not name_node:
                return

            symbol = self._node_text(name_node, source)
            atom_type = "class" if node.type == "class_declaration" else "function"
            atom_id = f"{atom_type}:{rel_path}:{symbol}:{node.start_point[0] + 1}"
            content = self._node_text(node, source)
            concept = self._infer_concept(symbol, rel_path, content)

            atoms.append(
                CodeChunk(
                    atom_id=atom_id,
                    atom_type=atom_type,
                    symbol=symbol,
                    file_path=rel_path,
                    module_path=module_name,
                    language="typescript" if rel_path.endswith((".ts", ".tsx")) else "javascript",
                    content=trim_content(content),
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    metadata={"node_type": node.type, "concept_hint": concept},
                )
            )
            relations.append(
                ParsedRelation(
                    source=f"file:{rel_path}",
                    target=atom_id,
                    relation_type="references",
                    metadata={"reason": "declares"},
                )
            )

            superclass = node.child_by_field_name("superclass")
            if superclass:
                relations.append(
                    ParsedRelation(
                        source=atom_id,
                        target=f"class_ref:{self._node_text(superclass, source).strip()}",
                        relation_type="inherits",
                        metadata={},
                    )
                )

        if node.type == "import_statement":
            import_text = self._node_text(node, source).replace("\n", " ").strip()
            import_atom_id = f"import:{rel_path}:{node.start_point[0] + 1}"
            atoms.append(
                CodeChunk(
                    atom_id=import_atom_id,
                    atom_type="import",
                    symbol=import_text,
                    file_path=rel_path,
                    module_path=module_name,
                    language="typescript" if rel_path.endswith((".ts", ".tsx")) else "javascript",
                    content=import_text,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    metadata={"node_type": node.type},
                )
            )
            relations.append(
                ParsedRelation(
                    source=f"file:{rel_path}",
                    target=f"module:{import_text}",
                    relation_type="imports",
                    metadata={"statement": import_text},
                )
            )

        if node.type == "call_expression":
            fn = node.child_by_field_name("function")
            if fn:
                called = self._node_text(fn, source).strip()
                if called:
                    relations.append(
                        ParsedRelation(
                            source=f"file:{rel_path}",
                            target=f"function_ref:{called}",
                            relation_type="calls",
                            metadata={"callee": called},
                        )
                    )

    def _infer_concept(self, symbol: str | None, file_path: str, content: str) -> str | None:
        text = f"{symbol or ''} {file_path} {content[:500]}".lower()
        if any(k in text for k in ("auth", "token", "login", "jwt", "oauth")):
            return "authentication"
        if any(k in text for k in ("database", "postgres", "sql", "session", "query")):
            return "database_access"
        if any(k in text for k in ("router", "endpoint", "api", "request", "response")):
            return "api_boundary"
        if any(k in text for k in ("config", "settings", "env", "secret")):
            return "configuration"
        return None

    def _walk(self, node: Node) -> Iterable[Node]:
        yield node
        for child in node.children:
            yield from self._walk(child)

    def _node_text(self, node: Node, source: bytes) -> str:
        return source[node.start_byte : node.end_byte].decode("utf-8", errors="ignore")
