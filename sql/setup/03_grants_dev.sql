-- =============================================================================
-- 03_grants_dev.sql
-- Run as: Azure admin superuser
-- Connected to: morning_meetings_dev
-- Purpose: Grant development privileges to morning_briefings_dev
-- =============================================================================

-- Revoke default PUBLIC privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CONNECT ON DATABASE morning_meetings_dev FROM PUBLIC;

-- Allow morning_briefings_dev to connect
GRANT CONNECT ON DATABASE morning_meetings_dev TO morning_briefings_dev;

-- Allow morning_briefings_dev to see objects in the schema
GRANT USAGE ON SCHEMA morning_briefings TO morning_briefings_dev;

-- DML + TRUNCATE (for test data resets)
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE
    ON ALL TABLES IN SCHEMA morning_briefings
    TO morning_briefings_dev;

-- Sequences (USAGE + SELECT + UPDATE for setval resets)
GRANT USAGE, SELECT, UPDATE
    ON ALL SEQUENCES IN SCHEMA morning_briefings
    TO morning_briefings_dev;

-- Auto-grant on future tables/sequences
ALTER DEFAULT PRIVILEGES
    IN SCHEMA morning_briefings
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO morning_briefings_dev;

ALTER DEFAULT PRIVILEGES
    IN SCHEMA morning_briefings
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO morning_briefings_dev;
