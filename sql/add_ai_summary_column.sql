-- Add ai_summary column to entries table
-- Stores the AI-generated summary as a JSON array of strings
ALTER TABLE pu_morning_briefings.entries
ADD COLUMN ai_summary JSON DEFAULT NULL;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_entries_ai_summary ON pu_morning_briefings.entries (id)
WHERE ai_summary IS NOT NULL;
