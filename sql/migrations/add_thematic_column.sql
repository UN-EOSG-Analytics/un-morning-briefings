-- Migration: Add thematic column to entries table
ALTER TABLE pu_morning_briefings.entries
  ADD COLUMN IF NOT EXISTS thematic TEXT;
