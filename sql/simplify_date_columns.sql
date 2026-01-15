-- Remove created_at and updated_at columns, keep only date column
-- The date column will now store both date and time
ALTER TABLE pu_morning_briefings.entries
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;
-- Note: Run this manually in your database when ready
-- This will remove the created_at and updated_at columns
-- Make sure you have backups before running this migration

-- For now, you may want to keep these columns and just stop using them
-- Uncomment the lines above when you're ready to drop them permanently

