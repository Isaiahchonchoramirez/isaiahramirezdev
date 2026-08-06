#!/usr/bin/env bash
# One-shot setup for the cold-review engine. Idempotent; safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

WHEEL="$(ls reef-*.whl 2>/dev/null | head -1)"
[ -n "$WHEEL" ] || { echo "no wheel found in $(pwd)"; exit 1; }
echo "engine wheel: $WHEEL"

# The `embed` extra pulls the local embedding model. Without it the engine ingests but
# cannot build vectors, and every document fails at the embedding stage.
REQ="reef[embed] @ file://$(pwd)/$WHEEL"

for bin in "/opt/homebrew/opt/postgresql@17/bin" "/usr/lib/postgresql/17/bin" "/usr/local/opt/postgresql@17/bin"; do
    [ -d "$bin" ] && export PATH="$bin:$PATH" && break
done
command -v psql >/dev/null || { echo "psql not found — install PostgreSQL 17 with pgvector"; exit 1; }
command -v uv   >/dev/null || { echo "uv not found — see ENGINE_USAGE.md"; exit 1; }

echo "==> database"
bash ops/bootstrap-local-db.sh

echo "==> schema"
uv run --with "$REQ" --with alembic alembic upgrade head

cat > run.sh <<RUNEOF
#!/usr/bin/env bash
# Shorthand: ./run.sh query "..."  ->  reef query "..."
cd "\$(dirname "\$0")"
exec uv run --with "reef[embed] @ file://\$(pwd)/$WHEEL" reef "\$@"
RUNEOF
chmod +x run.sh

echo "==> resolved configuration"
uv run --with "$REQ" reef config

cat <<'DONE'

Setup complete.

  ./run.sh init
  ./run.sh ingest ../deal-room --room cold-review
  ./run.sh coverage cold-review
  ./run.sh query "your question here" --room cold-review

Check the dotenv line above says "none present" before recording any result.
DONE
