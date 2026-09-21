from pathlib import Path

from app.services.parser_service import ParserService


def test_parser_extracts_python_symbols(tmp_path: Path) -> None:
    code = """
import os

class AuthService:
    pass

def login():
    return os.getenv("USER")
"""
    sample = tmp_path / "sample.py"
    sample.write_text(code.strip() + "\n", encoding="utf-8")

    parser = ParserService()
    result = parser.parse_repository(tmp_path)

    atom_types = [atom.atom_type for atom in result.atoms]
    symbols = [atom.symbol for atom in result.atoms if atom.symbol]
    relation_types = [rel.relation_type for rel in result.relations]

    assert "file" in atom_types
    assert "class" in atom_types
    assert "function" in atom_types
    assert any("AuthService" in symbol for symbol in symbols)
    assert any("login" in symbol for symbol in symbols)
    assert "imports" in relation_types
