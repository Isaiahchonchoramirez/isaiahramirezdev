"""Rules from the architecture documents, enforced as tests rather than as good intentions.

A convention nobody checks is a convention that decays. These are cheap and they fail
loudly the first time someone reaches for a shortcut.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1] / "src" / "reef"

#: Provider SDKs that must only ever be imported by the model gateway.
#: `docs/reef/05-architecture.md` principle 3: "No provider SDK is imported anywhere but
#: there. Model quality resets every six months and Reef must be able to take the upgrade
#: in an afternoon."
PROVIDER_MODULES = frozenset(
    {"anthropic", "openai", "cohere", "google", "mistralai", "sentence_transformers", "litellm"}
)

#: The one module allowed to import them.
GATEWAY = "models_gateway.py"


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(), filename=str(path))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            found.add(node.module.split(".")[0])
    return found


def _python_files() -> list[Path]:
    return sorted(p for p in SRC.rglob("*.py") if "__pycache__" not in p.parts)


def test_provider_sdks_are_only_imported_by_the_gateway() -> None:
    offenders: list[str] = []
    for path in _python_files():
        if path.name == GATEWAY:
            continue
        leaked = _imports(path) & PROVIDER_MODULES
        if leaked:
            offenders.append(f"{path.relative_to(SRC)} imports {sorted(leaked)}")
    assert not offenders, (
        "provider SDKs must be confined to the model gateway so a model can be swapped "
        "in one place:\n  " + "\n  ".join(offenders)
    )


def test_chunk_sizes_fit_the_encoder() -> None:
    """A chunk larger than the encoder's window is truncated at embed time while still
    claiming provenance over text that never reached the model."""
    from reef.config import Settings

    settings = Settings()
    assert settings.chunk_max_tokens <= settings.embedding_max_tokens
    assert settings.chunk_target_tokens <= settings.chunk_max_tokens


def test_every_tenant_scoped_model_has_a_room_id() -> None:
    """`TENANT_SCOPED_TABLES` drives the row-level-security migration. A model added
    without a policy is a cross-tenant leak, so the list and the models must agree."""
    from reef.models import TENANT_SCOPED_TABLES, Base

    for name, table in Base.metadata.tables.items():
        if name == "room":
            continue
        assert name in TENANT_SCOPED_TABLES, (
            f"{name} is not in TENANT_SCOPED_TABLES, so no RLS policy was created for it"
        )
        assert "room_id" in table.columns, f"{name} is tenant-scoped but has no room_id"


def test_tenant_scoped_tables_all_exist_as_models() -> None:
    from reef.models import TENANT_SCOPED_TABLES, Base

    for name in TENANT_SCOPED_TABLES:
        assert name in Base.metadata.tables, f"{name} is listed for RLS but has no model"


@pytest.mark.integration
def test_row_level_security_is_forced_on_every_tenant_table() -> None:
    """Postgres exempts the table owner from RLS unless it is FORCE'd, and migrations run
    as the owner. Without FORCE the policy is bypassable by anything holding owner
    credentials, which makes the tenant boundary decorative."""
    from sqlalchemy import text

    from reef import db
    from reef.models import TENANT_SCOPED_TABLES

    with db.get_engine().connect() as conn:
        rows = dict(
            conn.execute(
                text(
                    "SELECT relname, relforcerowsecurity FROM pg_class WHERE relname = ANY(:names)"
                ),
                {"names": list(TENANT_SCOPED_TABLES)},
            ).all()
        )

    if not rows:
        pytest.skip("schema not migrated")

    unforced = [name for name, forced in rows.items() if not forced]
    assert not unforced, f"row-level security is not FORCE'd on: {unforced}"
