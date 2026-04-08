-- =============================================================================
-- 001_fts_and_text_content.sql
-- Run as: Azure admin superuser
-- Connected to: morning_meetings  (or morning_meetings_dev)
-- Purpose: Add text_content (plain text, populated by the application layer)
--          and search_vector (weighted tsvector built by trigger from
--          text_content + headline) to the entries table.
-- Idempotent: safe to re-run (IF NOT EXISTS / CREATE OR REPLACE guards)
-- =============================================================================

-- ─── 1. Add columns ─────────────────────────────────────────────────────────

ALTER TABLE morning_briefings.entries
    ADD COLUMN IF NOT EXISTS text_content  TEXT,
    ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- ─── 2. search_vector trigger function ───────────────────────────────────────
--
-- Builds a weighted tsvector from headline (A) + text_content (B).
-- text_content is populated by the application layer (JS) which strips HTML
-- using a proper parser — the trigger only handles the tsvector computation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION morning_briefings.entries_fts_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recompute when text_content or headline actually changed
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

-- ─── 3. Attach trigger ───────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS entries_fts_update ON morning_briefings.entries;

CREATE TRIGGER entries_fts_update
    BEFORE INSERT OR UPDATE ON morning_briefings.entries
    FOR EACH ROW
    EXECUTE FUNCTION morning_briefings.entries_fts_update();

-- ─── 4. GIN index on search_vector ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_entries_search_vector
    ON morning_briefings.entries USING GIN (search_vector);

-- ─── 5. Backfill existing rows ──────────────────────────────────────────────
-- For existing rows, text_content must be populated by a one-time application
-- script (since HTML stripping is done in JS, not SQL). After running the app
-- script, touch rows to rebuild search_vector:
--
--   UPDATE morning_briefings.entries SET text_content = text_content;
--
-- Or run the backfill script: node scripts/backfill-text-content.js
-- =============================================================================
