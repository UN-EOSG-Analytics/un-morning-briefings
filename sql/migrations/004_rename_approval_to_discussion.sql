-- Migration 004: Rename approval_status → discussion_status
--
-- The field was originally an approval gate (approved/denied) but evolved into
-- a post-meeting tracker (pending/discussed). Rename to reflect actual purpose.

-- Rename column
ALTER TABLE morning_briefings.entries RENAME COLUMN approval_status TO discussion_status;

-- Recreate constraint with new name
ALTER TABLE morning_briefings.entries DROP CONSTRAINT IF EXISTS chk_approval_status;
ALTER TABLE morning_briefings.entries ADD CONSTRAINT chk_discussion_status
  CHECK (discussion_status IN ('pending', 'discussed'));

-- Recreate index with new name
DROP INDEX IF EXISTS morning_briefings.idx_entries_approval_status;
CREATE INDEX IF NOT EXISTS idx_entries_discussion_status
  ON morning_briefings.entries (discussion_status);
