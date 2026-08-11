"""Document currency, declared by evidence rather than inferred from a name.

Revision ID: 0004_document_status
Revises: 0003_provenance_columns
Create Date: 2026-08-07

Cold review 001 found three escalation-worthy errors that all reduce to the engine holding
a fact about a document and never consulting it (`COLD_REVIEW_ADJUDICATION_001` §4).
`processing_state` already answers "could we read it". Nothing answered "does it still
stand", so a formally withdrawn revenue schedule ranked 0.0026 behind the live one with
nothing to tell them apart.

The table is deliberately narrow. It records declarations, not judgements: one row per
(subject document, declaring span), where the span is NOT NULL. That column is the whole
point — `COLD_REVIEW_ADJUDICATION_001` §8 admits `SUPERSEDED_OR_WITHDRAWN` to the state
contract on the condition that it is evidenced, and §3 of the contract bars any state
assigned without naming the test it passed. A status the reader cannot go and read for
themselves would fail both.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from reef.models import StatusKind

revision: str = "0004_document_status"
down_revision: str | None = "0003_provenance_columns"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "document_status"


def upgrade() -> None:
    op.create_table(
        TABLE,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "room_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("room.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "declared_by_document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # NOT NULL, and the reason this table is trustworthy. See the module docstring.
        sa.Column(
            "declared_by_span_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("span.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("declaration_text", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("document_id", "declared_by_span_id", name="uq_document_status_source"),
        sa.CheckConstraint(
            "status IN (" + ", ".join(f"'{s}'" for s in StatusKind.ALL) + ")",
            name="ck_document_status_status",
        ),
        # Self-withdrawal is how a notice that quotes its own filename would silently
        # retract itself, and the reader would have no way to see that it had happened.
        sa.CheckConstraint(
            "document_id <> declared_by_document_id",
            name="ck_document_status_not_self",
        ),
    )
    op.create_index("ix_document_status_room_document", TABLE, ["room_id", "document_id"])

    # Same treatment as every other tenant-scoped table. FORCE because migrations run as
    # the owner and Postgres exempts the owner from RLS unless forced — without it the
    # tenant boundary on this table would be decorative. `test_architecture_rules` asserts
    # the model is in TENANT_SCOPED_TABLES, and the integration test asserts the FORCE.
    op.execute(f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY;")
    op.execute(f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY;")
    op.execute(
        f"""
        CREATE POLICY {TABLE}_room_isolation ON {TABLE}
            USING (room_id = nullif(current_setting('reef.room_id', true), '')::uuid)
            WITH CHECK (room_id = nullif(current_setting('reef.room_id', true), '')::uuid);
        """
    )


def downgrade() -> None:
    op.execute(f"DROP POLICY IF EXISTS {TABLE}_room_isolation ON {TABLE};")
    op.drop_index("ix_document_status_room_document", table_name=TABLE)
    op.drop_table(TABLE)
