#!/usr/bin/env bash
# One-shot setup for the cold-review engine. Idempotent; safe to re-run.
#
# Installs the engine and provisions a database that belongs to this review and nothing
# else. It does **not** ingest the data room — that happens in Phase 3, after your
# questions are frozen. See REVIEWER_INSTRUCTIONS.md for why the order matters.
#
# Usage: bash setup.sh <your-reviewer-id>      e.g. bash setup.sh rv2
set -euo pipefail
cd "$(dirname "$0")"

# ------------------------------------------------------------------ reviewer identity
# The export is a directory; the database is not. Two reviewers on one host share a
# Postgres server, and the first review's index is invisible to any check that only looks
# at files. A previous review was contaminated exactly this way. So the database name and
# the room name both carry your id, and the verifier refuses any room that is not yours.
REVIEWER_ID="${1:-${REEF_REVIEWER_ID:-}}"
if [ -z "$REVIEWER_ID" ]; then
    echo "usage: bash setup.sh <your-reviewer-id>     (2-16 chars, a-z 0-9 _)" >&2
    echo "  pick anything that is yours alone on this machine, e.g. your initials" >&2
    exit 2
fi
if ! printf '%s' "$REVIEWER_ID" | grep -qE '^[a-z0-9_]{2,16}$'; then
    echo "reviewer id must match ^[a-z0-9_]{2,16}$ (got '$REVIEWER_ID')" >&2
    exit 2
fi

DB_NAME="reef_cr_${REVIEWER_ID}"
ROOM_NAME="cold-review-${REVIEWER_ID}"

WHEEL="$(ls reef-*.whl 2>/dev/null | head -1)"
[ -n "$WHEEL" ] || { echo "no wheel found in $(pwd)"; exit 1; }
echo "engine wheel: $WHEEL"
echo "reviewer:     $REVIEWER_ID"
echo "database:     $DB_NAME"
echo "room:         $ROOM_NAME"

# The `embed` extra pulls the local embedding model. Without it the engine ingests but
# cannot build vectors, and every document fails at the embedding stage.
REQ="reef[embed] @ file://$(pwd)/$WHEEL"

for bin in "/opt/homebrew/opt/postgresql@17/bin" "/usr/lib/postgresql/17/bin" "/usr/local/opt/postgresql@17/bin"; do
    [ -d "$bin" ] && export PATH="$bin:$PATH" && break
done
command -v psql >/dev/null || { echo "psql not found — install PostgreSQL 17 with pgvector"; exit 1; }
command -v uv   >/dev/null || { echo "uv not found — see ENGINE_USAGE.md"; exit 1; }

# ----------------------------------------------------------------- refuse a dirty database
# `bootstrap-local-db.sh` is idempotent, which means it will happily adopt a database that
# already holds someone else's index. Refuse that here rather than discover it in the
# results.
if psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    EXISTING="$(psql -d "$DB_NAME" -tAc \
        "SELECT count(*) FROM room" 2>/dev/null || echo 0)"
    if [ "${EXISTING:-0}" -gt 0 ]; then
        cat >&2 <<EOF

Database $DB_NAME already contains $EXISTING room(s).

A cold review must start from an empty database or its results are not attributable to
this export. Either pick a different reviewer id, or discard the old one:

    bash teardown.sh $REVIEWER_ID

EOF
        exit 1
    fi
fi

echo "==> database"
REEF_DB_NAME="$DB_NAME" bash ops/bootstrap-local-db.sh

# ------------------------------------------------------------------ environment, in a file
# Written to a file you can read rather than a `.env` the engine picks up invisibly. The
# engine reports a dotenv as a configuration source; these exports are visible in run.sh
# and in this file, and nowhere else.
cat > reviewer-env.sh <<ENVEOF
# Written by setup.sh. Sourced by run.sh and read by ../verify_blinding.sh.
# Read it: everything the engine's configuration depends on is here.
export REEF_REVIEWER_ID="$REVIEWER_ID"
export REEF_ROOM="$ROOM_NAME"
export REEF_DB_NAME="$DB_NAME"
export REEF_DATABASE_URL="postgresql+psycopg://reef_app:reef_app@localhost:5432/$DB_NAME"
export REEF_MIGRATION_DATABASE_URL="postgresql+psycopg://reef:reef@localhost:5432/$DB_NAME"
ENVEOF

# shellcheck disable=SC1091
. ./reviewer-env.sh

echo "==> schema"
uv run --with "$REQ" --with alembic alembic upgrade head

cat > run.sh <<RUNEOF
#!/usr/bin/env bash
# Shorthand: ./run.sh query "..."  ->  reef query "..." against your own database.
cd "\$(dirname "\$0")"
. ./reviewer-env.sh
for bin in "/opt/homebrew/opt/postgresql@17/bin" "/usr/lib/postgresql/17/bin" "/usr/local/opt/postgresql@17/bin"; do
    [ -d "\$bin" ] && export PATH="\$bin:\$PATH" && break
done
exec uv run --with "reef[embed] @ file://\$(pwd)/$WHEEL" reef "\$@"
RUNEOF
chmod +x run.sh

echo "==> resolved configuration"
uv run --with "$REQ" reef config

cat <<DONE

Setup complete. The engine is installed and $DB_NAME is empty.

**Do not ingest yet.** Read the room and write your questions first — Phases 1 and 2 of
REVIEWER_INSTRUCTIONS.md. Loading the room now would show you what the engine covers
before you have committed to what you expect, which is the thing being measured.

When your questions are frozen, Phase 3 begins with:

  bash ../verify_blinding.sh ..            # confirms your database is still yours
  ./run.sh ingest ../deal-room --room $ROOM_NAME
  ./run.sh coverage $ROOM_NAME
  ./run.sh query "your question here" --room $ROOM_NAME

Your room name is **$ROOM_NAME**. Use it everywhere.

When the review is over: bash teardown.sh $REVIEWER_ID

Check the dotenv line above says "none present" before recording any result.
DONE
