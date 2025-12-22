-- Create schema
CREATE SCHEMA IF NOT EXISTS un_briefings;

-- Create entries table
CREATE TABLE
    un_briefings.entries (
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
        author TEXT,
        status TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL
    );

-- Create indices for entries table
-- TODO
-- Create images table
CREATE TABLE
    un_briefings.images (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        blob_url TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        position INTEGER,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_images_entry_id FOREIGN KEY (entry_id) REFERENCES un_briefings.entries (id) ON UPDATE CASCADE ON DELETE CASCADE
    );

-- Create index for images table
-- TODO