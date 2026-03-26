-- This file is mounted into the PostgreSQL Docker container for initial setup.
-- Actual schema is managed by Alembic migrations.
-- Enables the pgcrypto extension for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for full-text search on username/name
