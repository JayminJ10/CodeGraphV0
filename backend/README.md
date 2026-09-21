# CodeGraph AI Backend

Production-style FastAPI backend for repository analysis, dependency/concept graph generation, hybrid semantic retrieval, and AI-powered codebase Q&A.

## Tech Stack

- FastAPI + Uvicorn
- PostgreSQL + pgvector
- SQLAlchemy ORM
- GitPython
- tree-sitter (Python, JavaScript, TypeScript)
- NetworkX
- OpenAI embeddings + chat models

## Project Structure

- `app/main.py`: FastAPI app bootstrap, startup initialization, health endpoint.
- `app/routes/repo.py`: repository ingest/analyze endpoint and graph endpoint.
- `app/routes/query.py`: natural-language query endpoint.
- `app/services/repo_service.py`: repo URL validation, metadata persistence, cloning.
- `app/services/parser_service.py`: tree-sitter parsing + atom extraction + relationships.
- `app/services/graph_service.py`: NetworkX graph builder + JSON serialization + neighborhood expansion.
- `app/services/embedding_service.py`: atom persistence, embedding generation, vector retrieval.
- `app/services/ai_service.py`: hybrid RAG pipeline + LLM answer generation.
- `app/models/database.py`: SQLAlchemy models and DB init.
- `app/models/schemas.py`: Pydantic request/response contracts.
- `app/core/config.py`: environment-based settings.
- `app/core/dependencies.py`: FastAPI dependency injection providers.

## Environment

1. Copy `.env.example` to `.env`.
2. Fill in `OPENAI_API_KEY`.
3. Adjust `DATABASE_URL` if needed.

## Run with Docker

```bash
docker compose up --build
```

Backend: `http://localhost:8000`

## Run Locally

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Analyze Repository

`POST /repos/analyze`

```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

Pipeline:
1. Clone repo.
2. Parse code into atoms and relations.
3. Build dependency + concept graph.
4. Generate and persist embeddings.

### Get Graph JSON

`GET /repos/{repo_id}/graph`

Returns:

```json
{
  "repo_id": "uuid",
  "nodes": [],
  "edges": []
}
```

### Ask a Question

`POST /query`

```json
{
  "repo_id": "uuid",
  "question": "How does authentication work?"
}
```

Hybrid retrieval strategy:
1. Vector search over atom embeddings.
2. Graph neighbor expansion around top hits.
3. Concept-aware reranking.
4. LLM answer generation with retrieved context.

## Notes

- Backend-only scope in this phase. Frontend will be implemented later.
- The graph includes low-level symbols and higher-level concept nodes.

## Deploy on Vercel

This backend can be deployed as a Vercel Python serverless function using `api/index.py`.

Set Vercel project root to the `backend` directory and configure these environment variables:

- `OPENAI_API_KEY`
- `DATABASE_URL` (managed Postgres, recommended for production)
- `REPO_STORAGE_ROOT=/tmp/codegraph/repos`
- `CORS_ALLOW_ORIGINS` (comma-separated explicit origins)
- `CORS_ALLOW_ORIGIN_REGEX` (for Vercel preview URLs, e.g. `https://.*\.vercel\.app`)

Important: repository analysis is compute-heavy and may exceed default serverless limits depending on repository size.
