-- =============================================================================
-- 03_grants.sql
-- Run as: Azure admin superuser
-- Connected to: morning_meetings
-- Purpose: Grant minimum required privileges to morning_briefings_app
-- =============================================================================

-- Revoke default PUBLIC privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CONNECT ON DATABASE morning_meetings FROM PUBLIC;

-- Allow morning_briefings_app to connect
GRANT CONNECT ON DATABASE morning_meetings TO morning_briefings_app;

-- Allow morning_briefings_app to see objects in the schema (not CREATE or ALTER)
GRANT USAGE ON SCHEMA morning_briefings TO morning_briefings_app;

-- DML only on all current tables
GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA morning_briefings
    TO morning_briefings_app;

-- Sequences (required for SERIAL columns: users.id, user_whitelist.id, etc.)
GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA morning_briefings
    TO morning_briefings_app;

-- Auto-grant on future tables/sequences created by admin
ALTER DEFAULT PRIVILEGES
    IN SCHEMA morning_briefings
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO morning_briefings_app;

ALTER DEFAULT PRIVILEGES
    IN SCHEMA morning_briefings
    GRANT USAGE, SELECT ON SEQUENCES TO morning_briefings_app;

-- Explicitly NOT granted (denied by default):
-- TRUNCATE, DROP, CREATE, ALTER, REFERENCES, TRIGGER, SUPERUSER
