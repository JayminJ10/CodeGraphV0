from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.models.database import init_db
from app.routes.query import router as query_router
from app.routes.repo import router as repo_router

settings = get_settings()
setup_logging(settings.log_level)
allowed_origins = [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.repo_storage_path.mkdir(parents=True, exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


app.include_router(repo_router)
app.include_router(query_router)
