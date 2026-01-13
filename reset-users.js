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

async function resetUsersTable() {
  const client = await pool.connect();
  try {
    console.log('⏳ Checking users table...');
    
    // Get current count
    const countBefore = await client.query(
      'SELECT COUNT(*) as count FROM pu_morning_briefings.users'
    );
    
    console.log(`\n📊 Current users: ${countBefore.rows[0].count}`);
    
    if (countBefore.rows[0].count === 0) {
      console.log('✓ Users table is already empty');
    } else {
      console.log('\n⏳ Deleting all users...');
      const deleteResult = await client.query(
        'DELETE FROM pu_morning_briefings.users'
      );
      console.log(`✓ Deleted ${deleteResult.rowCount} user(s)`);
    }
    
    // Verify deletion
    const countAfter = await client.query(
      'SELECT COUNT(*) as count FROM pu_morning_briefings.users'
    );
    
    console.log(`\n✅ Users table reset successfully!`);
    console.log(`   Remaining users: ${countAfter.rows[0].count}`);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetUsersTable();
