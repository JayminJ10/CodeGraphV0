from __future__ import annotations

import hashlib
import logging
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

from git import Repo
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.database import Repository, RepositoryStatus

logger = logging.getLogger(__name__)


class RepoService:
    GITHUB_URL_RE = re.compile(r"^https://github\.com/[^/]+/[^/]+/?$")

    def __init__(self) -> None:
        self.settings = get_settings()

    def validate_repo_url(self, repo_url: str) -> None:
        if not self.GITHUB_URL_RE.match(repo_url):
            raise ValueError("Only public GitHub repository URLs are currently supported.")

    def _repo_name_from_url(self, repo_url: str) -> str:
        path = urlparse(repo_url).path.strip("/")
        return path.split("/")[-1]

    def _repo_dir_from_url(self, repo_url: str) -> Path:
        digest = hashlib.sha1(repo_url.encode("utf-8")).hexdigest()[:12]
        name = self._repo_name_from_url(repo_url)
        return self.settings.repo_storage_path / f"{name}-{digest}"

    def get_or_create_repository(self, db: Session, repo_url: str) -> Repository:
        existing = db.query(Repository).filter(Repository.repo_url == repo_url).one_or_none()
        if existing:
            return existing

        local_path = self._repo_dir_from_url(repo_url)
        local_path.parent.mkdir(parents=True, exist_ok=True)

        repo = Repository(
            repo_url=repo_url,
            name=self._repo_name_from_url(repo_url),
            local_path=str(local_path),
            status=RepositoryStatus.pending,
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
        return repo

    def clone_repository(self, repo: Repository) -> Path:
        target = Path(repo.local_path)
        target.parent.mkdir(parents=True, exist_ok=True)

        if target.exists():
            shutil.rmtree(target)

        logger.info("Cloning repository %s into %s", repo.repo_url, target)
        Repo.clone_from(repo.repo_url, str(target))
        return target

    def set_status(
        self,
        db: Session,
        repo: Repository,
        status: RepositoryStatus,
        last_error: str | None = None,
    ) -> Repository:
        repo.status = status
        repo.last_error = last_error
        db.add(repo)
        db.commit()
        db.refresh(repo)
        return repo
