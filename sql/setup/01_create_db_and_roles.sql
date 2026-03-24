-- =============================================================================
-- 01_create_db_and_roles.sql
-- Run as: un80devpgadmin80 (Azure admin)
-- Connected to: postgres (maintenance database)

-- echo "PROD: $(openssl rand -base64 32)" && echo "DEV:  $(openssl rand -base64 32)"
-- =============================================================================

-- Production database
CREATE DATABASE morning_meetings
  WITH
    OWNER     = un80devpgadmin80;

COMMENT ON DATABASE morning_meetings IS
  'UN Morning Briefings application database (production)';

-- Production application role (least-privilege: SELECT/INSERT/UPDATE/DELETE only)
CREATE ROLE morning_briefings_app
  WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    CONNECTION LIMIT 25
    PASSWORD '1ur8JeL2FelKS3wXdV36X+WA+HdM/WEwhLeH2kI2lOg=';

-- Development database
CREATE DATABASE morning_meetings_dev
  WITH
    OWNER     = un80devpgadmin80;

COMMENT ON DATABASE morning_meetings_dev IS
  'UN Morning Briefings application database (development)';

-- Development role (DML + TRUNCATE for test resets)
CREATE ROLE morning_briefings_dev
  WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    CONNECTION LIMIT 10
    PASSWORD 'zPCUNm96h0Au0XGcy9onFFN4dEWxggEVCyiy9dOwYoc=';

-- =============================================================================
-- IMPORTANT: Now connect to each new database and lock down PUBLIC.
-- These commands MUST be run while connected to the target database.
-- =============================================================================

-- >>> Connect to morning_meetings, then run:
-- REVOKE CONNECT ON DATABASE morning_meetings FROM PUBLIC;
-- REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- >>> Connect to morning_meetings_dev, then run:
-- REVOKE CONNECT ON DATABASE morning_meetings_dev FROM PUBLIC;
-- REVOKE CREATE ON SCHEMA public FROM PUBLIC;
