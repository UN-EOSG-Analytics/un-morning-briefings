/* eslint-disable @typescript-eslint/no-explicit-any */

import { Pool, types } from "pg";

// Prevent pg from converting TIMESTAMP (without time zone, OID 1114) into a
// JS Date object via new Date(rawString). That conversion uses the server's
// local timezone, which shifts the wall-clock value.  Instead, keep the raw
// Postgres string so that parseDateString() can read the literal NYC time.
// TIMESTAMPTZ (OID 1184) is unaffected and continues to return proper UTC Dates.
types.setTypeParser(1114, (val: string) => val);

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
