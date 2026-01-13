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

async function addMissingColumns() {
  const client = await pool.connect();
  try {
    console.log('Checking for missing columns in users table...');
    
    // Check if verification_token column exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'pu_morning_briefings' 
        AND table_name = 'users' 
        AND column_name = 'verification_token'
      );
    `);
    
    if (!result.rows[0].exists) {
      console.log('Adding verification_token column...');
      await client.query(`
        ALTER TABLE pu_morning_briefings.users 
        ADD COLUMN verification_token VARCHAR(255);
      `);
      console.log('✓ verification_token column added');
    }
    
    // Check if verification_token_expires column exists
    const result2 = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'pu_morning_briefings' 
        AND table_name = 'users' 
        AND column_name = 'verification_token_expires'
      );
    `);
    
    if (!result2.rows[0].exists) {
      console.log('Adding verification_token_expires column...');
      await client.query(`
        ALTER TABLE pu_morning_briefings.users 
        ADD COLUMN verification_token_expires TIMESTAMP;
      `);
      console.log('✓ verification_token_expires column added');
    }
    
    // Check if email_verified column exists
    const result3 = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'pu_morning_briefings' 
        AND table_name = 'users' 
        AND column_name = 'email_verified'
      );
    `);
    
    if (!result3.rows[0].exists) {
      console.log('Adding email_verified column...');
      await client.query(`
        ALTER TABLE pu_morning_briefings.users 
        ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
      `);
      console.log('✓ email_verified column added');
    }
    
    console.log('✓ All required columns are present!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns();
