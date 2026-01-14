const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTokens() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check all users with their token status
    const result = await client.query(
      `SELECT id, email, email_verified, verification_token, verification_token_expires, created_at 
       FROM pu_morning_briefings.users 
       ORDER BY created_at DESC`
    );

    console.log('📋 All users in database:\n');
    result.rows.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`  Email Verified: ${user.email_verified}`);
      console.log(`  Token: ${user.verification_token || '❌ NULL'}`);
      console.log(`  Token Expires: ${user.verification_token_expires || '❌ NULL'}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });

    // Check table structure
    const columnResult = await client.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = 'pu_morning_briefings' AND table_name = 'users'
       ORDER BY ordinal_position`
    );

    console.log('\n📋 Table structure:\n');
    columnResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTokens();
