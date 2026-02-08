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
CREATE INDEX IF NOT EXISTS idx_images_entry_id ON pu_morning_briefings.images(entry_id);

-- Create user_whitelist table (for managing authorized emails)
CREATE TABLE IF NOT EXISTS pu_morning_briefings.user_whitelist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES pu_morning_briefings.users(id) ON DELETE SET NULL,
    added_by INTEGER REFERENCES pu_morning_briefings.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whitelist_email_format CHECK (email LIKE '%@un.org')
);

CREATE INDEX IF NOT EXISTS idx_whitelist_email ON pu_morning_briefings.user_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_whitelist_user_id ON pu_morning_briefings.user_whitelist(user_id);

-- Create password_resets table (for secure password recovery)
CREATE TABLE IF NOT EXISTS pu_morning_briefings.password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES pu_morning_briefings.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON pu_morning_briefings.password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON pu_morning_briefings.password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON pu_morning_briefings.password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_used_at ON pu_morning_briefings.password_resets(used_at);