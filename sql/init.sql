-- Create schema
CREATE SCHEMA IF NOT EXISTS pu_morning_briefings;

-- Create users table first (referenced by entries)
CREATE TABLE IF NOT EXISTS pu_morning_briefings.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    team VARCHAR(100) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    CONSTRAINT email_format CHECK (email LIKE '%@un.org')
);

-- Create entries table with author_id foreign key
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
        source_name TEXT,
        source_url TEXT,
        source_date TEXT,
        pu_note TEXT,
        comment TEXT,
        author_id INTEGER REFERENCES pu_morning_briefings.users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        ai_summary TEXT,
        approval_status TEXT DEFAULT 'pending',
        previous_entry_id TEXT REFERENCES pu_morning_briefings.entries(id) ON DELETE SET NULL
    );

-- Create indices for entries table
CREATE INDEX IF NOT EXISTS idx_entries_status ON pu_morning_briefings.entries (status);
CREATE INDEX IF NOT EXISTS idx_entries_author_id ON pu_morning_briefings.entries (author_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON pu_morning_briefings.entries (date);
CREATE INDEX IF NOT EXISTS idx_entries_status_author_id ON pu_morning_briefings.entries (status, author_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON pu_morning_briefings.users(email);
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