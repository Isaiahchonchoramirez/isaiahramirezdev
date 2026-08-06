"""Record which pipeline and which parser produced each document's anchors.

Revision ID: 0003_provenance_columns
Revises: 0002_evidence_invariants
Create Date: 2026-08-06

Both are nullable because documents ingested before this migration genuinely have no
recorded pipeline version, and back-filling a guess would be worse than an honest null —
it would assert provenance nobody verified.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_provenance_columns"
down_revision: str | None = "0002_evidence_invariants"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("document", sa.Column("pipeline_version", sa.String(length=32), nullable=True))
    op.add_column("document", sa.Column("extractor", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("document", "extractor")
    op.drop_column("document", "pipeline_version")
