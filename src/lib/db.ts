import { Pool } from 'pg';

const globalForDb = global as unknown as { db: Pool };

export const db =
  globalForDb.db ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

// Helper to execute queries with automatic schema prefix
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await db.connect();
  try {
    await client.query('SET search_path TO pu_morning_briefings, public');
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
