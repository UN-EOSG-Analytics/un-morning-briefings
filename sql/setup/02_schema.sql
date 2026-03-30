-- =============================================================================
-- 02_schema.sql
-- Run as: Azure admin superuser
-- Connected to: morning_meetings  (or morning_meetings_dev)
-- Idempotent: safe to re-run (IF NOT EXISTS / DROP IF EXISTS guards)
-- =============================================================================

-- Schema
CREATE SCHEMA IF NOT EXISTS morning_briefings;

-- Trigger function (must exist before any trigger references it)
CREATE OR REPLACE FUNCTION morning_briefings.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS morning_briefings.users (
    id                          SERIAL PRIMARY KEY,
    email                       VARCHAR(255) NOT NULL UNIQUE,
    password_hash               VARCHAR(255) NOT NULL,
    first_name                  VARCHAR(100) NOT NULL,
    last_name                   VARCHAR(100) NOT NULL,
    team                        VARCHAR(100) NOT NULL,
    role                        VARCHAR(20)  NOT NULL DEFAULT 'editor',
    email_verified              BOOLEAN DEFAULT FALSE,
    verification_token          VARCHAR(255),
    verification_token_expires  TIMESTAMP,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Anchored regex: rejects evil-un.org, subunit.un.org, un.org.evil.com
    CONSTRAINT email_format CHECK (
        email ~ '^[a-zA-Z0-9._%+\-]+@un\.org$'
    )
);

CREATE INDEX IF NOT EXISTS idx_users_email
    ON morning_briefings.users (email);

CREATE INDEX IF NOT EXISTS idx_users_verification_token
    ON morning_briefings.users (verification_token);

DROP TRIGGER IF EXISTS update_users_updated_at ON morning_briefings.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON morning_briefings.users
    FOR EACH ROW
    EXECUTE FUNCTION morning_briefings.update_updated_at_column();

-- ─── entries ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS morning_briefings.entries (
    id                TEXT NOT NULL PRIMARY KEY,
    category          TEXT NOT NULL,
    priority          TEXT NOT NULL,
    region            TEXT NOT NULL,
    country           TEXT NOT NULL,
    headline          TEXT NOT NULL,
    date              TIMESTAMP(3) NOT NULL,
    entry             TEXT NOT NULL,
    source_url        TEXT,
    pu_note           TEXT,
    status            TEXT NOT NULL DEFAULT 'draft',
    approval_status   TEXT NOT NULL DEFAULT 'pending',
    ai_summary        JSONB,
    source_date       DATE,
    source_name       TEXT,
    comment           TEXT,
    author_id         INTEGER REFERENCES morning_briefings.users ON DELETE SET NULL,
    previous_entry_id TEXT REFERENCES morning_briefings.entries ON DELETE SET NULL,
    thematic          TEXT,
    text_content      TEXT,
    search_vector     TSVECTOR,
    created_at        TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at        TIMESTAMP(3) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT chk_status CHECK (
        status IN ('draft', 'submitted')
    ),
    CONSTRAINT chk_approval_status CHECK (
        approval_status IN ('pending', 'discussed')
    ),
    CONSTRAINT chk_priority CHECK (
        priority IN ('SG''s attention', 'Situational Awareness')
    ),
    CONSTRAINT chk_category CHECK (
        category IN ('Article', 'Meeting Note', 'Code Cable', 'Situational Update', 'UN Internal Document', 'Other')
    )
);

CREATE INDEX IF NOT EXISTS idx_entries_approval_status
    ON morning_briefings.entries (approval_status);

CREATE INDEX IF NOT EXISTS idx_entries_ai_summary
    ON morning_briefings.entries (id)
    WHERE ai_summary IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entries_source_date
    ON morning_briefings.entries (source_date);

CREATE INDEX IF NOT EXISTS idx_entries_author_id
    ON morning_briefings.entries (author_id);

CREATE INDEX IF NOT EXISTS idx_entries_status_author_id
    ON morning_briefings.entries (status, author_id);

CREATE INDEX IF NOT EXISTS idx_entries_previous_entry_id
    ON morning_briefings.entries (previous_entry_id);

CREATE INDEX IF NOT EXISTS idx_entries_date
    ON morning_briefings.entries (date DESC);

CREATE INDEX IF NOT EXISTS idx_entries_created_at
    ON morning_briefings.entries (created_at DESC);

DROP TRIGGER IF EXISTS update_entries_updated_at ON morning_briefings.entries;
CREATE TRIGGER update_entries_updated_at
    BEFORE UPDATE ON morning_briefings.entries
    FOR EACH ROW
    EXECUTE FUNCTION morning_briefings.update_updated_at_column();

-- ─── entries: full-text search trigger ───────────────────────────────────────
-- text_content is populated by the application layer (JS stripHtmlToText).
-- The trigger only builds search_vector from headline + text_content.

CREATE OR REPLACE FUNCTION morning_briefings.entries_fts_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.text_content IS NOT DISTINCT FROM OLD.text_content
       AND NEW.headline IS NOT DISTINCT FROM OLD.headline
    THEN
        RETURN NEW;
    END IF;

    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.headline, '')), 'A')
        ||
        setweight(to_tsvector('english', coalesce(NEW.text_content, '')), 'B');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entries_fts_update ON morning_briefings.entries;
CREATE TRIGGER entries_fts_update
    BEFORE INSERT OR UPDATE ON morning_briefings.entries
    FOR EACH ROW
    EXECUTE FUNCTION morning_briefings.entries_fts_update();

CREATE INDEX IF NOT EXISTS idx_entries_search_vector
    ON morning_briefings.entries USING GIN (search_vector);

-- ─── images ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS morning_briefings.images (
    id         TEXT NOT NULL PRIMARY KEY,
    entry_id   TEXT NOT NULL
                 CONSTRAINT fk_images_entry_id
                 REFERENCES morning_briefings.entries
                 ON UPDATE CASCADE ON DELETE CASCADE,
    filename   TEXT NOT NULL,
    mime_type  TEXT NOT NULL,
    blob_url   TEXT NOT NULL,
    width      INTEGER,
    height     INTEGER,
    position   INTEGER,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ─── user_whitelist ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS morning_briefings.user_whitelist (
    id         SERIAL PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    user_id    INTEGER REFERENCES morning_briefings.users ON DELETE SET NULL,
    added_by   INTEGER REFERENCES morning_briefings.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE morning_briefings.user_whitelist IS
    'Stores pre-approved email addresses allowed to register for the platform';

CREATE INDEX IF NOT EXISTS idx_whitelist_email
    ON morning_briefings.user_whitelist (email);

-- ─── password_resets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS morning_briefings.password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES morning_briefings.users ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at    TIMESTAMP,
    ip_address VARCHAR(45)
);

COMMENT ON TABLE morning_briefings.password_resets IS
    'Stores secure password reset tokens with expiration';
COMMENT ON COLUMN morning_briefings.password_resets.token_hash IS
    'Bcrypt hash of the reset token for security';
COMMENT ON COLUMN morning_briefings.password_resets.expires_at IS
    'Token expiration time (typically 30 minutes)';
COMMENT ON COLUMN morning_briefings.password_resets.used_at IS
    'Timestamp when token was used (null if unused)';

CREATE INDEX IF NOT EXISTS idx_password_resets_token
    ON morning_briefings.password_resets (token_hash);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id
    ON morning_briefings.password_resets (user_id);

CREATE INDEX IF NOT EXISTS idx_password_resets_expires
    ON morning_briefings.password_resets (expires_at);

CREATE INDEX IF NOT EXISTS idx_password_resets_used_at
    ON morning_briefings.password_resets (used_at);
