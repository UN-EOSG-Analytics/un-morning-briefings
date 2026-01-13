#!/usr/bin/env node
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function recreateUsersTable() {
  const client = await pool.connect();
  try {
    console.log('Checking current users table structure...');
    
    // Check if table exists and show its structure
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'pu_morning_briefings' 
        AND table_name = 'users'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('\n✓ Users table exists. Current structure:');
      
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'pu_morning_briefings' 
        AND table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nColumns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Drop the table
      console.log('\n⏳ Dropping users table...');
      await client.query('DROP TABLE IF EXISTS pu_morning_briefings.users CASCADE');
      console.log('✓ Table dropped');
    } else {
      console.log('✓ Users table does not exist');
    }
    
    // Create the table with proper schema
    console.log('\n⏳ Creating users table with desired columns...');
    await client.query(`
      CREATE TABLE pu_morning_briefings.users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        team VARCHAR(100) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT email_format CHECK (email LIKE '%@un.org')
      );
    `);
    console.log('✓ Users table created successfully');
    
    // Create indexes
    console.log('\n⏳ Creating indexes...');
    await client.query(`
      CREATE INDEX idx_users_email ON pu_morning_briefings.users(email);
      CREATE INDEX idx_users_verification_token ON pu_morning_briefings.users(verification_token);
    `);
    console.log('✓ Indexes created');
    
    // Create trigger for updated_at
    console.log('\n⏳ Creating update trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION pu_morning_briefings.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_users_updated_at ON pu_morning_briefings.users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON pu_morning_briefings.users
        FOR EACH ROW EXECUTE FUNCTION pu_morning_briefings.update_updated_at_column();
    `);
    console.log('✓ Trigger created');
    
    // Verify final structure
    console.log('\n⏳ Verifying final table structure...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'pu_morning_briefings' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✓ Final table structure:');
    finalColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n✅ Users table successfully recreated with all desired columns!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

recreateUsersTable();
