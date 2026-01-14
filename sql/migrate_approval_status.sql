-- Migration: Convert approved boolean to approval_status enum
-- This script converts the approved column from BOOLEAN to TEXT (approval_status)

-- Step 1: Add new approval_status column
ALTER TABLE pu_morning_briefings.entries 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- Step 2: Migrate existing data
UPDATE pu_morning_briefings.entries 
SET approval_status = CASE 
  WHEN approved = true THEN 'approved'
  WHEN approved = false THEN 'pending'
  ELSE 'pending'
END
WHERE approval_status = 'pending';

-- Step 3: Drop the old approved column (optional, if you want to clean up)
-- ALTER TABLE pu_morning_briefings.entries DROP COLUMN IF EXISTS approved;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_entries_approval_status ON pu_morning_briefings.entries (approval_status);
