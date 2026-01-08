"""
Script to create a test user in the database
"""
import os
import sys
import uuid
import bcrypt
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

load_dotenv()

def create_user(email: str, password: str, name: str = None, role: str = 'user'):
    """Create a user with hashed password"""
    
    # Hash password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
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
        # Generate user ID
        user_id = str(uuid.uuid4())
        
        # Insert user
        cursor.execute(
            """
            INSERT INTO pu_morning_briefings.users 
            (id, email, password_hash, name, role, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                updated_at = NOW()
            RETURNING id, email, name, role
            """,
            (user_id, email.lower(), password_hash, name, role)
        )
        
        user = cursor.fetchone()
        connection.commit()
        
        print(f"✓ User created successfully:")
        print(f"  ID: {user[0]}")
        print(f"  Email: {user[1]}")
        print(f"  Name: {user[2]}")
        print(f"  Role: {user[3]}")
        
    except Exception as e:
        connection.rollback()
        print(f"✗ Error creating user: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        connection.close()

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Create a user in the database')
    parser.add_argument('email', help='User email address')
    parser.add_argument('password', help='User password')
    parser.add_argument('--name', help='User full name', default=None)
    parser.add_argument('--role', help='User role (user/admin)', default='user')
    
    args = parser.parse_args()
    
    print(f"Creating user: {args.email}")
    create_user(args.email, args.password, args.name, args.role)
