-- Migration: Rename "Secretary-General's Attention" to "SG's attention"
-- This migration updates all existing entries in the morning_meeting_entries table
-- to use the new shorter priority name.

UPDATE entries
SET priority = 'SG''s attention'
WHERE priority = 'Secretary-General''s Attention';

-- If there's a morning_meeting_entries table instead of entries:
UPDATE morning_meeting_entries
SET priority = 'SG''s attention'
WHERE priority = 'Secretary-General''s Attention';

