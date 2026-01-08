"""
Script to set up the users table in the database
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def setup_users_table():
    """Create users table if it doesn't exist"""
    
    # Connect to database
    connection = psycopg2.connect(
        host=os.getenv('AZURE_POSTGRES_HOST'),
        database=os.getenv('AZURE_POSTGRES_DB'),
        user=os.getenv('AZURE_POSTGRES_USER'),
        password=os.getenv('AZURE_POSTGRES_PASSWORD'),
        port=os.getenv('AZURE_POSTGRES_PORT', 5432),
        sslmode='require'
    )
    cursor = connection.cursor()
    
    try:
        print("Creating users table...")
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pu_morning_briefings.users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                name TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email 
            ON pu_morning_briefings.users (email);
        """)
        
        connection.commit()
        print("✓ Users table created successfully!")
        
    except Exception as e:
        connection.rollback()
        print(f"✗ Error creating users table: {e}")
        return False
    finally:
        cursor.close()
        connection.close()
    
    return True

if __name__ == '__main__':
    setup_users_table()
