-- Migration: Drop the deprecated approved column
-- This script removes the old approved boolean column now that we've migrated to approval_status

-- Drop the approved column
ALTER TABLE pu_morning_briefings.entries 
DROP COLUMN IF EXISTS approved;
