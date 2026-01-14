/* eslint-disable @typescript-eslint/no-explicit-any */

import { Pool } from 'pg';

const globalForDb = global as unknown as { db: Pool };

/**
 * PostgreSQL connection pool
 * Reused across hot reloads in development to avoid connection pool exhaustion
 */
export const db =
  globalForDb.db ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

/**
 * Execute a database query with automatic schema prefix
 * Automatically sets search_path to pu_morning_briefings schema
 * 
 * @param text - SQL query string
 * @param params - Optional array of query parameters
 * @returns Promise that resolves to query result with rows and rowCount
 * @example
 * const result = await query('SELECT * FROM entries WHERE id = $1', [id]);
 */
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
