/* eslint-disable @typescript-eslint/no-explicit-any */

import { Pool } from "pg";

const globalForDb = global as unknown as { db: Pool };

const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_URL_DEV ?? process.env.DATABASE_URL);

/**
 * PostgreSQL connection pool
 * Reused across hot reloads in development to avoid connection pool exhaustion
 */
export const db =
  globalForDb.db ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

/**
 * Execute a database query.
 * All SQL must use explicit morning_briefings. schema prefix (PgBouncer-compatible).
 */
export async function query<T = any>(
  text: string,
  params?: any[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const result = await db.query(text, params);
  return result;
}
