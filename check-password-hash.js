const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPasswordIssue() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get the existing user
    const result = await client.query(
      `SELECT id, email, password_hash FROM pu_morning_briefings.users WHERE email = 'thiel.henrik@un.org'`
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('📋 User found:', user.email);
    console.log('Password hash:', user.password_hash);
    console.log('Hash length:', user.password_hash?.length);
    
    // Check if it's a valid bcrypt hash (should start with $2a$, $2b$, or $2y$)
    if (!user.password_hash?.startsWith('$2')) {
      console.log('\n❌ ERROR: Password hash is NOT a bcrypt hash!');
      console.log('This explains why login fails - the password was stored incorrectly.');
      console.log('\nPossible causes:');
      console.log('1. Password was stored as plain text instead of hashed');
      console.log('2. Hash function failed during registration');
      console.log('3. Wrong value was stored in the database');
    } else {
      console.log('\n✅ Password hash looks like a valid bcrypt hash');
      
      // Try to compare with a test password
      const testPassword = 'TestPassword123!';
      try {
        const match = await bcrypt.compare(testPassword, user.password_hash);
        console.log(`\nTest comparison with "${testPassword}": ${match}`);
      } catch (e) {
        console.log('\n❌ Bcrypt comparison failed:', e.message);
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPasswordIssue();
