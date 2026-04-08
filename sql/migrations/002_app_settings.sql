-- =============================================================================
-- 002_app_settings.sql
-- Adds:
--   1. app_settings   — global key-value config (e.g. scheduled email time/recipients)
--   2. email_send_log — audit log of every briefing email send attempt
--
-- Run as: admin user on morning_meetings / morning_meetings_dev
-- Idempotent: safe to re-run (IF NOT EXISTS guards)
-- =============================================================================

-- ─── app_settings ─────────────────────────────────────────────────────────────
-- Stores global application configuration as key/value pairs.
-- Known keys:
--   email_time       VARCHAR  "HH:MM" wall-clock in America/New_York (ET)
--   email_recipients TEXT     JSON array of recipient email strings

CREATE TABLE IF NOT EXISTS morning_briefings.app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT         NOT NULL,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── email_send_log ───────────────────────────────────────────────────────────
-- Records every briefing email send attempt (manual or scheduled).
-- recipients is a JSON array of address strings stored as TEXT.
-- triggered_by is the email of the authenticated user, or 'scheduler'.

CREATE TABLE IF NOT EXISTS morning_briefings.email_send_log (
    id            SERIAL       PRIMARY KEY,
    sent_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    recipients    TEXT         NOT NULL,
    status        VARCHAR(10)  NOT NULL CHECK (status IN ('success', 'failed')),
    error_msg     TEXT,
    briefing_date DATE,
    triggered_by  VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_at
    ON morning_briefings.email_send_log (sent_at DESC);
