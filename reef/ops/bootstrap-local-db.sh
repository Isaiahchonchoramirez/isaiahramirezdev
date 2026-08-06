#!/usr/bin/env bash
# Create the Reef database and its two roles on a local Homebrew Postgres.
#
# Two roles exist deliberately. `reef` owns the schema and runs migrations. `reef_app` is
# what the application connects as, and it is neither a superuser nor a table owner —
# because Postgres exempts both from row-level security. A tenant boundary the application
# role can walk straight through is not a boundary.
#
# Idempotent. Safe to re-run. `--reset` drops the database first.

set -euo pipefail

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
PSQL="${PG_BIN}/psql"
SUPERUSER="${SUPERUSER:-$(whoami)}"

if [[ "${1:-}" == "--reset" ]]; then
    echo "dropping database reef"
    "${PSQL}" -U "${SUPERUSER}" -d postgres -c "DROP DATABASE IF EXISTS reef;"
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
    "SELECT 1 FROM pg_database WHERE datname='reef'" | grep -q 1; then
    echo "creating database reef owned by reef"
    "${PSQL}" -U "${SUPERUSER}" -d postgres -c "CREATE DATABASE reef OWNER reef;"
fi

# Extensions need superuser, so they are created here rather than in a migration.
"${PSQL}" -U "${SUPERUSER}" -d reef -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

GRANT CONNECT ON DATABASE reef TO reef_app;
GRANT USAGE ON SCHEMA public TO reef_app;

-- Migrations create tables after this runs, so grant by default for anything `reef`
-- creates later rather than enumerating tables that do not exist yet.
ALTER DEFAULT PRIVILEGES FOR ROLE reef IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO reef_app;
ALTER DEFAULT PRIVILEGES FOR ROLE reef IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO reef_app;
SQL

echo "reef database ready at postgresql://reef_app@localhost:5432/reef"
