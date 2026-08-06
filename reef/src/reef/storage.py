"""Object storage behind one interface.

Originals are immutable and content-addressed: the key is derived from the SHA-256, so
writing the same bytes twice is idempotent and a key always names exactly one payload.
Nothing above this module knows whether the bytes are on a local disk or in a bucket.

Keys are tenant-prefixed. ADR-003 §4 requires tenant id in every object key, which is
what makes per-tenant deletion and the dedicated/VPC deployment tiers possible without a
rewrite.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import TYPE_CHECKING, Protocol
from uuid import UUID

from reef.config import Settings, get_settings

if TYPE_CHECKING:  # pragma: no cover
    from mypy_boto3_s3.client import S3Client


def original_key(room_id: UUID, sha256: str) -> str:
    """Content-addressed, tenant-prefixed, fanned out two levels.

    The `ab/cd/` fan-out keeps directory sizes workable on the filesystem backend; a room
    with 100k documents in one flat directory is slow to list on every filesystem worth
    naming.
    """
    return f"{room_id}/originals/{sha256[:2]}/{sha256[2:4]}/{sha256}"


def render_key(room_id: UUID, document_id: UUID, page_number: int) -> str:
    return f"{room_id}/renders/{document_id}/page-{page_number:05d}.png"


class ObjectStore(Protocol):
    def put(self, bucket: str, key: str, data: bytes) -> None: ...

    def get(self, bucket: str, key: str) -> bytes: ...

    def exists(self, bucket: str, key: str) -> bool: ...

    def delete_prefix(self, bucket: str, prefix: str) -> int:
        """Remove everything under a prefix. Deletion must be real, and a per-room prefix
        is what makes 'delete this room' a complete operation rather than a partial one."""
        ...


class FilesystemStore:
    """Local backend. No daemon, no credentials, no network."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def _path(self, bucket: str, key: str) -> Path:
        # Keys are constructed internally, never taken from user input, but a traversal
        # check costs nothing and this is the one place where a bad key escapes the root.
        resolved = (self._root / bucket / key).resolve()
        root = self._root.resolve()
        if not resolved.is_relative_to(root):
            raise ValueError(f"key escapes storage root: {key!r}")
        return resolved

    def put(self, bucket: str, key: str, data: bytes) -> None:
        path = self._path(bucket, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Write-then-rename, so a crash mid-write cannot leave a truncated object that
        # later reads as a valid but wrong document.
        tmp = path.with_suffix(path.suffix + ".partial")
        tmp.write_bytes(data)
        tmp.replace(path)

    def get(self, bucket: str, key: str) -> bytes:
        return self._path(bucket, key).read_bytes()

    def exists(self, bucket: str, key: str) -> bool:
        return self._path(bucket, key).is_file()

    def delete_prefix(self, bucket: str, prefix: str) -> int:
        base = self._path(bucket, prefix)
        if not base.exists():
            return 0
        count = sum(1 for p in base.rglob("*") if p.is_file())
        shutil.rmtree(base)
        return count


class S3Store:
    """S3-compatible backend for deployed environments."""

    def __init__(self, settings: Settings) -> None:
        import boto3

        self._client: S3Client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )

    def put(self, bucket: str, key: str, data: bytes) -> None:
        self._client.put_object(Bucket=bucket, Key=key, Body=data)

    def get(self, bucket: str, key: str) -> bytes:
        body: bytes = self._client.get_object(Bucket=bucket, Key=key)["Body"].read()
        return body

    def exists(self, bucket: str, key: str) -> bool:
        from botocore.exceptions import ClientError

        try:
            self._client.head_object(Bucket=bucket, Key=key)
        except ClientError:
            return False
        return True

    def delete_prefix(self, bucket: str, prefix: str) -> int:
        paginator = self._client.get_paginator("list_objects_v2")
        deleted = 0
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
            if keys:
                self._client.delete_objects(Bucket=bucket, Delete={"Objects": keys})
                deleted += len(keys)
        return deleted


def get_store(settings: Settings | None = None) -> ObjectStore:
    settings = settings or get_settings()
    if settings.storage_backend == "s3":
        return S3Store(settings)
    return FilesystemStore(settings.storage_root)
