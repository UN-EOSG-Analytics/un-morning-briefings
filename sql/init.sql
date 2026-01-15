-- Create schema
CREATE SCHEMA IF NOT EXISTS pu_morning_briefings;

-- Create entries table
CREATE TABLE
    pu_morning_briefings.entries (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        region TEXT NOT NULL,
        country TEXT NOT NULL,
        headline TEXT NOT NULL,
        date TIMESTAMP(3) NOT NULL,
        entry TEXT NOT NULL,
        source_url TEXT,
        pu_note TEXT,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        status TEXT NOT NULL DEFAULT 'submitted'
    );

-- Create indices for entries table
CREATE INDEX IF NOT EXISTS idx_entries_status ON pu_morning_briefings.entries (status);
CREATE INDEX IF NOT EXISTS idx_entries_author ON pu_morning_briefings.entries (author);
CREATE INDEX IF NOT EXISTS idx_entries_date ON pu_morning_briefings.entries (date);
CREATE INDEX IF NOT EXISTS idx_entries_status_author ON pu_morning_briefings.entries (status, author);
-- Create images table
CREATE TABLE
    pu_morning_briefings.images (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        blob_url TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        position INTEGER,
        CONSTRAINT fk_images_entry_id FOREIGN KEY (entry_id) REFERENCES pu_morning_briefings.entries (id) ON UPDATE CASCADE ON DELETE CASCADE
    );

-- Create index for images table
-- TODO