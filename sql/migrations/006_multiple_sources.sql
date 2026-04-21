-- 006_multiple_sources.sql
-- Add `sources` JSONB column to entries table, replacing separate source_name/source_url/source_date columns.
-- Shape: [{"name": "Reuters", "url": "https://...", "date": "2026-04-19"}, ...]

-- Step 1: Add the new column
ALTER TABLE morning_briefings.entries
  ADD COLUMN IF NOT EXISTS sources JSONB;

-- Step 2: Migrate existing data
UPDATE morning_briefings.entries
SET sources = CASE
  -- source_name is a JSON array like ["Reuters","BBC"]
  WHEN source_name IS NOT NULL AND source_name LIKE '[%' THEN
    (SELECT jsonb_agg(
      jsonb_build_object(
        'name', elem.value #>> '{}',
        'url', CASE WHEN elem.ordinality = 1 THEN source_url ELSE NULL END,
        'date', CASE WHEN elem.ordinality = 1 THEN source_date::text ELSE NULL END
      )
    )
    FROM jsonb_array_elements(source_name::jsonb) WITH ORDINALITY AS elem(value, ordinality))
  -- source_name is a plain string, or only url/date exist
  WHEN source_name IS NOT NULL OR source_url IS NOT NULL OR source_date IS NOT NULL THEN
    jsonb_build_array(jsonb_build_object(
      'name', source_name,
      'url', source_url,
      'date', source_date::text
    ))
  ELSE NULL
END
WHERE source_name IS NOT NULL OR source_url IS NOT NULL OR source_date IS NOT NULL;
