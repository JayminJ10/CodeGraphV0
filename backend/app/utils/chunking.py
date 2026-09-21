from __future__ import annotations

from dataclasses import dataclass


@dataclass
class CodeChunk:
    atom_id: str
    atom_type: str
    symbol: str | None
    file_path: str
    module_path: str | None
    language: str
    content: str
    start_line: int | None
    end_line: int | None
    metadata: dict


def trim_content(content: str, max_chars: int = 3000) -> str:
    if len(content) <= max_chars:
        return content
    return content[:max_chars] + "\n# ... truncated ..."
