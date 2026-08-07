#!/usr/bin/env bash
# Create a Reef database and its two roles on a local Homebrew Postgres.
#
# Two roles exist deliberately. `reef` owns the schema and runs migrations. `reef_app` is
# what the application connects as, and it is neither a superuser nor a table owner —
# because Postgres exempts both from row-level security. A tenant boundary the application
# role can walk straight through is not a boundary.
#
# The database *name* is a parameter, not a constant. Row-level security separates rooms
# inside one database; it does nothing to separate two evaluations that share a host. A
# blinded cold review needs a boundary the reviewer can see and drop, which is a database
# of its own — see benchmarks/cold-review/BLINDING_PROTOCOL.md.
#
# Idempotent. Safe to re-run. `--reset` drops the database first.
#
# Usage:
#   bash bootstrap-local-db.sh [--reset]
#   REEF_DB_NAME=reef_cr_ab bash bootstrap-local-db.sh

set -euo pipefail

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
PSQL="${PG_BIN}/psql"
SUPERUSER="${SUPERUSER:-$(whoami)}"
DB_NAME="${REEF_DB_NAME:-reef}"

# Interpolated into DDL that cannot be parameterised, so it is constrained rather than
# quoted: an identifier this narrow has nothing to escape.
if ! [[ "${DB_NAME}" =~ ^[a-z][a-z0-9_]{0,62}$ ]]; then
    echo "REEF_DB_NAME must match ^[a-z][a-z0-9_]{0,62}$ (got '${DB_NAME}')" >&2
    exit 2
fi

if [[ "${1:-}" == "--reset" ]]; then
    echo "dropping database ${DB_NAME}"
    "${PSQL}" -U "${SUPERUSER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
fi

"${PSQL}" -U "${SUPERUSER}" -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reef') THEN
        CREATE ROLE reef LOGIN PASSWORD 'reef' CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reef_app') THEN
        CREATE ROLE reef_app LOGIN PASSWORD 'reef_app' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;
SQL

if ! "${PSQL}" -U "${SUPERUSER}" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    echo "creating database ${DB_NAME} owned by reef"
    "${PSQL}" -U "${SUPERUSER}" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER reef;"
fi

# Extensions need superuser, so they are created here rather than in a migration.
"${PSQL}" -U "${SUPERUSER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<SQL
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

GRANT CONNECT ON DATABASE ${DB_NAME} TO reef_app;
GRANT USAGE ON SCHEMA public TO reef_app;

-- Migrations create tables after this runs, so grant by default for anything \`reef\`
-- creates later rather than enumerating tables that do not exist yet.
ALTER DEFAULT PRIVILEGES FOR ROLE reef IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO reef_app;
ALTER DEFAULT PRIVILEGES FOR ROLE reef IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO reef_app;
SQL

echo "reef database ready at postgresql://reef_app@localhost:5432/${DB_NAME}"
