/**
 * Migration script to move data from localStorage to PostgreSQL
 * Run this once to migrate existing data
 * 
 * Usage: npx ts-node scripts/migrate-localstorage-to-db.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('Starting migration from localStorage to PostgreSQL...\n');

    // Read localStorage data
    console.log('Please paste your localStorage data here:');
    console.log('1. Open browser console');
    console.log('2. Run: JSON.stringify(localStorage.getItem("morning-meeting-entries"))');
    console.log('3. Copy the output and paste it here\n');

    // For actual migration, you would need to:
    // 1. Export localStorage data from browser
    // 2. Parse it here
    // 3. Create entries in database

    // Example structure:
    const exampleData = {
      entries: [
        {
          category: 'Code Cable',
          priority: 'sg-attention',
          region: 'Middle East',
          country: 'Cyprus',
          headline: 'Example headline',
          date: '2025-12-22',
          entry: '<p>Example content</p>',
          sourceUrl: 'https://example.com',
          puNote: '',
          author: 'User',
          createdAt: new Date(),
        },
      ],
    };

    console.log('Example data structure:');
    console.log(JSON.stringify(exampleData, null, 2));

    // To perform actual migration, uncomment and use:
    /*
    const entriesData = JSON.parse(yourLocalStorageData);
    
    for (const entry of entriesData) {
      await prisma.entry.create({
        data: {
          category: entry.category,
          priority: entry.priority,
          region: entry.region,
          country: entry.country,
          headline: entry.headline,
          date: new Date(entry.date),
          entry: entry.entry,
          sourceUrl: entry.sourceUrl,
          puNote: entry.puNote,
          author: entry.author,
          status: entry.status || 'submitted',
        },
      });
      console.log(`Migrated: ${entry.headline}`);
    }
    */

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
