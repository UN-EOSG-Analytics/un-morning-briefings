-- Create users table for authentication
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

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON pu_morning_briefings.users(email);

-- Create index on verification token
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON pu_morning_briefings.users(verification_token);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION pu_morning_briefings.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON pu_morning_briefings.users
    FOR EACH ROW EXECUTE FUNCTION pu_morning_briefings.update_updated_at_column();
