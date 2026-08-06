-- Runs once, as superuser, on first container start.
--
-- Two roles exist deliberately. `reef` is the superuser that owns the schema and runs
-- migrations. `reef_app` is what the application connects as, and it is NOT a superuser
-- and does NOT own the tables — because Postgres exempts both superusers and table
-- owners from row-level security. A tenant boundary that the application role can walk
-- straight through is not a boundary.
--
-- Tables additionally carry FORCE ROW LEVEL SECURITY (see the migration), so even the
-- owner is subject to the policy. Belt and braces: this invariant is the one that keeps
-- one customer's deal room out of another's.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reef_app') THEN
        CREATE ROLE reef_app LOGIN PASSWORD 'reef_app' NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE reef TO reef_app;
GRANT USAGE ON SCHEMA public TO reef_app;

-- Migrations create tables after this runs, so grant by default for anything `reef`
-- creates later rather than trying to enumerate tables that do not exist yet.
ALTER DEFAULT PRIVILEGES FOR ROLE reef IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO reef_app;
ALTER DEFAULT PRIVILEGES FOR ROLE reef IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO reef_app;
