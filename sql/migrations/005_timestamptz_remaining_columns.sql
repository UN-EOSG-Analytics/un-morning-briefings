-- =============================================================================
-- 005_timestamptz_remaining_columns.sql
-- Convert remaining naive TIMESTAMP audit columns to TIMESTAMPTZ for
-- consistency with entries.created_at / entries.updated_at (fixed in 003).
--
-- Affected columns:
--   app_settings.updated_at
--   email_send_log.sent_at
--   images.created_at
--
-- Existing values are interpreted as UTC (matching Vercel server timezone).
-- Idempotent: safe to re-run.
-- =============================================================================

DO $$
BEGIN
    -- app_settings.updated_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'morning_briefings'
          AND table_name   = 'app_settings'
          AND column_name  = 'updated_at'
          AND data_type    = 'timestamp without time zone'
    ) THEN
        ALTER TABLE morning_briefings.app_settings
            ALTER COLUMN updated_at TYPE TIMESTAMP(3) WITH TIME ZONE
            USING updated_at AT TIME ZONE 'UTC';
    END IF;

    -- email_send_log.sent_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'morning_briefings'
          AND table_name   = 'email_send_log'
          AND column_name  = 'sent_at'
          AND data_type    = 'timestamp without time zone'
    ) THEN
        ALTER TABLE morning_briefings.email_send_log
            ALTER COLUMN sent_at TYPE TIMESTAMP(3) WITH TIME ZONE
            USING sent_at AT TIME ZONE 'UTC';
    END IF;

    -- images.created_at
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'morning_briefings'
          AND table_name   = 'images'
          AND column_name  = 'created_at'
          AND data_type    = 'timestamp without time zone'
    ) THEN
        ALTER TABLE morning_briefings.images
            ALTER COLUMN created_at TYPE TIMESTAMP(3) WITH TIME ZONE
            USING created_at AT TIME ZONE 'UTC';
    END IF;
END $$;
