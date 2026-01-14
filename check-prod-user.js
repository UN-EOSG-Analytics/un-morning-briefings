const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUser() {
  try {
    await client.connect();
    console.log('✅ Connected to Azure PostgreSQL');

    // Get all users
    const result = await client.query(
      `SELECT id, email, email_verified, verification_token, verification_token_expires 
       FROM pu_morning_briefings.users 
       ORDER BY created_at DESC LIMIT 5`
    );

    console.log('\n📋 Last 5 users in database:');
    console.log(JSON.stringify(result.rows, null, 2));

    // Check the specific token you mentioned (if provided)
    const token = process.argv[2];
    if (token) {
      console.log(`\n🔍 Checking for token: ${token}`);
      const tokenResult = await client.query(
        `SELECT id, email, email_verified, verification_token 
         FROM pu_morning_briefings.users 
         WHERE verification_token = $1`,
        [token]
      );
      if (tokenResult.rows.length > 0) {
        console.log('✅ Token found in database!');
        console.log(JSON.stringify(tokenResult.rows[0], null, 2));
      } else {
        console.log('❌ Token NOT found in database');
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();
