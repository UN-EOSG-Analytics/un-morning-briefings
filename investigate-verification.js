#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function investigateVerification() {
  const client = await pool.connect();
  try {
    console.log('🔍 VERIFICATION LINK INVESTIGATION\n');
    console.log('='.repeat(60));

    // 1. Check users table structure
    console.log('\n1️⃣ CHECKING USERS TABLE STRUCTURE');
    console.log('-'.repeat(60));
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'pu_morning_briefings' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns:');
    columns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Check for users with verification tokens
    console.log('\n2️⃣ CHECKING USERS WITH VERIFICATION TOKENS');
    console.log('-'.repeat(60));
    const users = await client.query(`
      SELECT 
        id,
        email,
        email_verified,
        verification_token,
        verification_token_expires,
        created_at
      FROM pu_morning_briefings.users
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    if (users.rows.length === 0) {
      console.log('⚠️  No users found in database');
    } else {
      users.rows.forEach((user, idx) => {
        console.log(`\nUser ${idx + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Verified: ${user.email_verified}`);
        console.log(`  Token Present: ${user.verification_token ? '✓ Yes' : '✗ No'}`);
        if (user.verification_token) {
          console.log(`  Token Length: ${user.verification_token.length} chars`);
          console.log(`  Token (first 20 chars): ${user.verification_token.substring(0, 20)}...`);
          console.log(`  Token Expires: ${user.verification_token_expires}`);
          const now = new Date();
          const expires = new Date(user.verification_token_expires);
          console.log(`  Expired: ${now > expires ? '✗ Yes' : '✓ No'}`);
        }
        console.log(`  Created: ${user.created_at}`);
      });
    }

    // 3. Test token generation
    console.log('\n3️⃣ TESTING TOKEN GENERATION');
    console.log('-'.repeat(60));
    const testToken = crypto.randomBytes(32).toString('hex');
    console.log(`Generated test token: ${testToken}`);
    console.log(`Token length: ${testToken.length} characters`);
    console.log(`Token type: hex (all lowercase and numbers 0-9, a-f)`);

    // 4. Test URL encoding
    console.log('\n4️⃣ TESTING URL ENCODING');
    console.log('-'.repeat(60));
    const encodedToken = encodeURIComponent(testToken);
    const decodedToken = decodeURIComponent(encodedToken);
    console.log(`Original token:   ${testToken}`);
    console.log(`URL encoded:      ${encodedToken}`);
    console.log(`URL decoded:      ${decodedToken}`);
    console.log(`Match: ${testToken === decodedToken ? '✓ Yes' : '✗ No'}`);

    // 5. Test token lookup with actual database
    console.log('\n5️⃣ TESTING TOKEN LOOKUP');
    console.log('-'.repeat(60));
    if (users.rows.length > 0 && users.rows[0].verification_token) {
      const realToken = users.rows[0].verification_token;
      const realEmail = users.rows[0].email;
      
      console.log(`Testing lookup with token from user: ${realEmail}`);
      const lookup = await client.query(
        `SELECT email FROM pu_morning_briefings.users WHERE verification_token = $1`,
        [realToken]
      );
      
      if (lookup.rows.length > 0) {
        console.log(`✓ Token found: ${lookup.rows[0].email}`);
      } else {
        console.log(`✗ Token NOT found - possible encoding issue`);
        
        // Try with URL encoded version
        const urlEncodedToken = encodeURIComponent(realToken);
        const lookup2 = await client.query(
          `SELECT email FROM pu_morning_briefings.users WHERE verification_token = $1`,
          [urlEncodedToken]
        );
        console.log(`  Trying URL encoded: ${lookup2.rows.length > 0 ? 'Found' : 'Not found'}`);
      }
    }

    // 6. Check email_verified status requirements
    console.log('\n6️⃣ CHECKING EMAIL VERIFICATION CONSTRAINTS');
    console.log('-'.repeat(60));
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'pu_morning_briefings'
      AND table_name = 'users';
    `);
    
    if (constraints.rows.length > 0) {
      console.log('Constraints found:');
      constraints.rows.forEach(c => {
        console.log(`  • ${c.constraint_name} (${c.constraint_type})`);
      });
    } else {
      console.log('No table constraints found');
    }

    // 7. Generate test verification URL
    console.log('\n7️⃣ GENERATING TEST VERIFICATION URL');
    console.log('-'.repeat(60));
    const testUrl = `https://un-morning-briefings.vercel.app/api/auth/verify-email?token=${testToken}`;
    console.log(`Test URL: ${testUrl}`);
    console.log(`URL length: ${testUrl.length} characters`);

    // 8. Check for any unverified users
    console.log('\n8️⃣ SUMMARY OF UNVERIFIED USERS');
    console.log('-'.repeat(60));
    const unverified = await client.query(`
      SELECT COUNT(*) as count FROM pu_morning_briefings.users WHERE email_verified = FALSE;
    `);
    console.log(`Unverified users: ${unverified.rows[0].count}`);

    // 9. Check database timezone
    console.log('\n9️⃣ DATABASE TIMEZONE & TIME CHECK');
    console.log('-'.repeat(60));
    const dbTime = await client.query('SELECT NOW() as current_time;');
    const dbTimestampTz = await client.query('SELECT NOW()::timestamptz as current_time_tz;');
    console.log(`Database time (NOW): ${dbTime.rows[0].current_time}`);
    console.log(`Database time (TZ): ${dbTimestampTz.rows[0].current_time_tz}`);
    console.log(`Local time: ${new Date()}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ INVESTIGATION COMPLETE\n');
    console.log('NEXT STEPS:');
    console.log('1. Check if tokens are stored as plain hex (no URL encoding)');
    console.log('2. Verify email_verified constraint allows NULL values');
    console.log('3. Check timezone consistency between local and database');
    console.log('4. Review register endpoint logs for token generation');
    console.log('5. Test the exact URL from the email that was sent');

  } catch (error) {
    console.error('❌ Investigation error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

investigateVerification();
