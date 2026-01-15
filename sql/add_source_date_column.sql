-- Add source_date column to entries table
-- Stores the date when the news/briefing content was published or dated
ALTER TABLE pu_morning_briefings.entries
ADD COLUMN source_date DATE DEFAULT NULL;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_entries_source_date ON pu_morning_briefings.entries (source_date);
