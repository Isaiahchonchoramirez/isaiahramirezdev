"""Evidence invariants: no unsupported claim, and forced row-level security.

Revision ID: 0002_evidence_invariants
Revises: 5b028485bccb
Create Date: 2026-08-06

These two rules are the reason Reef is trustworthy, so neither lives in application code.
ADR-003 §5, and `docs/reef/05-architecture.md`: "enforced at write time, not at render
time. Not hidden in the UI — rejected by the database, so no future code path can bypass
it."
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

from reef.models import TENANT_SCOPED_TABLES

revision: str = "0002_evidence_invariants"
down_revision: str | None = "5b028485bccb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# A DEFERRABLE constraint trigger, checked at COMMIT rather than at INSERT. That timing is
# the whole design: a claim and its support rows are written in the same transaction, and
# an immediate trigger would reject the claim before its support could exist. Deferring to
# commit lets the natural write order work while still making an unsupported claim
# impossible to persist.
CLAIM_SUPPORT_TRIGGER = """
CREATE OR REPLACE FUNCTION reef_claim_requires_support() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM support WHERE claim_id = NEW.id) THEN
        RAISE EXCEPTION
            'claim % has no supporting span; a claim without evidence cannot be persisted',
            NEW.id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER claim_requires_support
    AFTER INSERT OR UPDATE ON claim
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION reef_claim_requires_support();
"""

# Deleting the last support row must also fail, or the invariant holds only at creation
# and can be removed afterwards — which is the same as not holding.
SUPPORT_DELETE_TRIGGER = """
CREATE OR REPLACE FUNCTION reef_support_delete_guard() RETURNS trigger AS $$
BEGIN
    -- If the claim itself is gone the cascade is doing its job; nothing to protect.
    IF NOT EXISTS (SELECT 1 FROM claim WHERE id = OLD.claim_id) THEN
        RETURN OLD;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM support WHERE claim_id = OLD.claim_id) THEN
        RAISE EXCEPTION
            'removing the last support row would leave claim % unsupported',
            OLD.claim_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER support_delete_guard
    AFTER DELETE ON support
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION reef_support_delete_guard();
"""

# A vector whose producing model is unknown cannot be safely compared to any other vector,
# and re-embedding becomes unauditable. The pair is all-or-nothing.
EMBED_MODEL_CONSTRAINT = """
ALTER TABLE chunk ADD CONSTRAINT ck_chunk_embedding_has_model
    CHECK ((embedding IS NULL) = (embed_model IS NULL));
"""

# `state_detail` must say why. A coverage statement reporting "failed" with no reason is
# not a coverage statement, and eval gate G2 scores state correctness at 100%.
STATE_DETAIL_CONSTRAINT = """
ALTER TABLE document ADD CONSTRAINT ck_document_state_detail
    CHECK (
        processing_state NOT IN ('unsupported', 'failed')
        OR (state_detail IS NOT NULL AND length(trim(state_detail)) > 0)
    );
"""


def upgrade() -> None:
    op.execute(CLAIM_SUPPORT_TRIGGER)
    op.execute(SUPPORT_DELETE_TRIGGER)
    op.execute(EMBED_MODEL_CONSTRAINT)
    op.execute(STATE_DETAIL_CONSTRAINT)

    for table in TENANT_SCOPED_TABLES:
        # FORCE matters as much as ENABLE. Postgres exempts the table owner from RLS
        # unless forced, and migrations run as the owner — so without FORCE the policy
        # would be trivially bypassable by anything connecting with owner credentials.
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        # `nullif(..., '')::uuid` rather than a bare cast: an unset GUC reads as the empty
        # string, and casting that raises instead of returning no rows. The policy must
        # produce "nothing", not an error, so a query missing its tenant fails closed and
        # quietly rather than looking like a bug elsewhere.
        op.execute(
            f"""
            CREATE POLICY {table}_room_isolation ON {table}
                USING (room_id = nullif(current_setting('reef.room_id', true), '')::uuid)
                WITH CHECK (room_id = nullif(current_setting('reef.room_id', true), '')::uuid);
            """
        )


def downgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS {table}_room_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    op.execute("ALTER TABLE document DROP CONSTRAINT IF EXISTS ck_document_state_detail;")
    op.execute("ALTER TABLE chunk DROP CONSTRAINT IF EXISTS ck_chunk_embedding_has_model;")
    op.execute("DROP TRIGGER IF EXISTS support_delete_guard ON support;")
    op.execute("DROP FUNCTION IF EXISTS reef_support_delete_guard();")
    op.execute("DROP TRIGGER IF EXISTS claim_requires_support ON claim;")
    op.execute("DROP FUNCTION IF EXISTS reef_claim_requires_support();")
