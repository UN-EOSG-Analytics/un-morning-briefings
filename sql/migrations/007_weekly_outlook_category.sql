-- Add 'Weekly Outlook' to the chk_category constraint
ALTER TABLE morning_briefings.entries
  DROP CONSTRAINT chk_category,
  ADD CONSTRAINT chk_category CHECK (
    category IN ('Article', 'Meeting Note', 'Code Cable', 'Situational Update', 'UN Internal Document', 'Weekly Outlook', 'Other')
  );
