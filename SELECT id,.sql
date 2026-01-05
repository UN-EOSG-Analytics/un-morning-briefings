SELECT id,
       category,
       priority,
       region,
       country,
       headline,
       date,
       entry,
       source_url,
       pu_note,
       author,
       status,
       created_at,
       updated_at
FROM pu_morning_briefings.entries
LIMIT 1000;