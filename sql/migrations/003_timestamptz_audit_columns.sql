-- =============================================================================
-- 003_timestamptz_audit_columns.sql
-- Convert created_at / updated_at in the entries table from naive TIMESTAMP
-- to TIMESTAMPTZ so that UTC context is preserved on reads.
--
-- The existing values are UTC stored as naive timestamps (server TZ = UTC),
-- so we reinterpret them with AT TIME ZONE 'UTC' when casting.
--
-- The `date` column intentionally stays TIMESTAMP (stores NYC local time,
-- the 8 AM briefing cutoff logic depends on this).
--
-- Run as: Azure admin superuser (or any role with ALTER TABLE on entries)
-- Idempotent: safe to re-run (column type check guards each ALTER)
-- =============================================================================

DO $$
BEGIN
    -- created_at
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'morning_briefings'
          AND table_name   = 'entries'
          AND column_name  = 'created_at') = 'timestamp without time zone' THEN
        ALTER TABLE morning_briefings.entries
            ALTER COLUMN created_at TYPE TIMESTAMP(3) WITH TIME ZONE
            USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- updated_at
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'morning_briefings'
          AND table_name   = 'entries'
          AND column_name  = 'updated_at') = 'timestamp without time zone' THEN
        ALTER TABLE morning_briefings.entries
            ALTER COLUMN updated_at TYPE TIMESTAMP(3) WITH TIME ZONE
            USING updated_at AT TIME ZONE 'UTC';
    END IF;
END $$;
