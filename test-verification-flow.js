#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function testVerificationFlow() {
  const client = await pool.connect();
  try {
    console.log('🧪 TESTING COMPLETE VERIFICATION FLOW\n');
    console.log('='.repeat(70));

    // Generate test data
    const testEmail = `test-${Date.now()}@un.org`;
    const testToken = crypto.randomBytes(32).toString('hex');
    const testPassword = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(testPassword, 12);
    
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    console.log('\n📝 TEST DATA GENERATED:');
    console.log(`  Email: ${testEmail}`);
    console.log(`  Token: ${testToken}`);
    console.log(`  Token Length: ${testToken.length}`);
    console.log(`  Expires At: ${tokenExpires}`);

    // Insert test user
    console.log('\n📤 INSERTING TEST USER INTO DATABASE...');
    const insertResult = await client.query(
      `INSERT INTO pu_morning_briefings.users 
       (email, password_hash, first_name, last_name, team, verification_token, verification_token_expires, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, verification_token, verification_token_expires, email_verified;`,
      [
        testEmail.toLowerCase(),
        passwordHash,
        'Test',
        'User',
        'Political Unit (EOSG)',
        testToken,
        tokenExpires,
        false
      ]
    );

    const insertedUser = insertResult.rows[0];
    console.log('✓ User inserted');
    console.log(`  ID: ${insertedUser.id}`);
    console.log(`  Email: ${insertedUser.email}`);
    console.log(`  Token Stored: ${insertedUser.verification_token}`);
    console.log(`  Token Match: ${insertedUser.verification_token === testToken ? '✓ Yes' : '✗ No'}`);
    console.log(`  Verified: ${insertedUser.email_verified}`);

    // Retrieve and verify token
    console.log('\n🔍 RETRIEVING USER BY TOKEN...');
    const retrieveResult = await client.query(
      `SELECT id, email, verification_token, verification_token_expires, email_verified
       FROM pu_morning_briefings.users
       WHERE verification_token = $1 AND email_verified = FALSE`,
      [testToken]
    );

    if (retrieveResult.rows.length === 0) {
      console.log('✗ CRITICAL ISSUE: Token not found in retrieval!');
      console.log('  This would cause the "invalid_token" error on production');
      
      // Debug: Try to find the user by email instead
      const debugResult = await client.query(
        `SELECT id, email, verification_token FROM pu_morning_briefings.users WHERE email = $1`,
        [testEmail.toLowerCase()]
      );
      
      if (debugResult.rows.length > 0) {
        const storedToken = debugResult.rows[0].verification_token;
        console.log(`\n🐛 DEBUG INFO:`);
        console.log(`  User found by email: Yes`);
        console.log(`  Stored token: ${storedToken}`);
        console.log(`  Stored token length: ${storedToken ? storedToken.length : 'NULL'}`);
        console.log(`  Tokens match: ${storedToken === testToken ? 'Yes' : 'No'}`);
        
        if (storedToken !== testToken) {
          console.log(`\n⚠️  TOKEN MISMATCH DETECTED!`);
          console.log(`  Expected: ${testToken}`);
          console.log(`  Stored:   ${storedToken}`);
          console.log(`  Expected length: ${testToken.length}`);
          console.log(`  Stored length: ${storedToken.length}`);
        }
      }
    } else {
      const retrievedUser = retrieveResult.rows[0];
      console.log('✓ Token found successfully');
      console.log(`  Email: ${retrievedUser.email}`);
      console.log(`  Token: ${retrievedUser.verification_token}`);
      console.log(`  Verified: ${retrievedUser.email_verified}`);
      
      // Test verification
      console.log('\n✅ SIMULATING VERIFICATION...');
      const updateResult = await client.query(
        `UPDATE pu_morning_briefings.users
         SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL
         WHERE id = $1
         RETURNING id, email, email_verified, verification_token;`,
        [retrievedUser.id]
      );
      
      const updatedUser = updateResult.rows[0];
      console.log('✓ Email verified');
      console.log(`  Verified: ${updatedUser.email_verified}`);
      console.log(`  Token cleared: ${updatedUser.verification_token === null ? 'Yes' : 'No'}`);
    }

    // Test with URL encoded token
    console.log('\n🔗 TESTING WITH URL ENCODED TOKEN...');
    const encodedToken = encodeURIComponent(testToken);
    const decodedToken = decodeURIComponent(encodedToken);
    
    console.log(`  Original: ${testToken}`);
    console.log(`  Encoded:  ${encodedToken}`);
    console.log(`  Decoded:  ${decodedToken}`);
    console.log(`  Match:    ${decodedToken === testToken ? '✓ Yes' : '✗ No'}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST COMPLETE\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('🧹 CLEANING UP TEST DATA...');
    try {
      await client.query(
        `DELETE FROM pu_morning_briefings.users WHERE email LIKE $1`,
        ['test-%@un.org']
      );
      console.log('✓ Test data cleaned up');
    } catch (e) {
      console.log('⚠️  Could not clean up test data');
    }
    
    client.release();
    await pool.end();
  }
}

testVerificationFlow();
