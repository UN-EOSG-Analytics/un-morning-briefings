const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testRegistration() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Generate a test token like the registration endpoint does
    const testToken = crypto.randomBytes(32).toString('hex');
    const testEmail = `test-${Date.now()}@un.org`;
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    console.log('🧪 Testing token storage:\n');
    console.log(`Generated Token: ${testToken}`);
    console.log(`Test Email: ${testEmail}`);
    console.log(`Token Expires: ${tokenExpires.toISOString()}\n`);

    // Try to insert like registration does
    try {
      const result = await client.query(
        `INSERT INTO pu_morning_briefings.users (email, password_hash, first_name, last_name, team, verification_token, verification_token_expires)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, verification_token, verification_token_expires`,
        [
          testEmail,
          'hashedpassword123', 
          'Test',
          'User',
          'Test Team',
          testToken,
          tokenExpires
        ]
      );

      console.log('✅ Insert succeeded!\n');
      console.log('📋 Returned values:');
      console.log(JSON.stringify(result.rows[0], null, 2));

      // Now try to retrieve it
      const retrieveResult = await client.query(
        `SELECT id, email, verification_token, verification_token_expires 
         FROM pu_morning_briefings.users 
         WHERE email = $1`,
        [testEmail]
      );

      console.log('\n✅ Retrieved from DB:');
      console.log(JSON.stringify(retrieveResult.rows[0], null, 2));

      // Check if they match
      const storedToken = retrieveResult.rows[0].verification_token;
      if (storedToken === testToken) {
        console.log('\n✅ TOKEN MATCHES! Storage is working correctly');
      } else {
        console.log(`\n❌ TOKEN MISMATCH!`);
        console.log(`Generated: ${testToken}`);
        console.log(`Stored:    ${storedToken}`);
      }

      // Clean up
      await client.query(`DELETE FROM pu_morning_briefings.users WHERE email = $1`, [testEmail]);

    } catch (insertError) {
      console.error('❌ Insert failed:', insertError.message);
      console.error('Full error:', insertError);
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testRegistration();
