/**
 * Shared entry query utilities for API routes.
 * Eliminates duplication of SQL queries, country serialization, and entry fetching.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { query } from "@/lib/db";

// ─── Country Serialization ───────────────────────────────────────────────────

/** Serialize country field for database storage (string or array → JSON string) */
export function serializeCountry(country: string | string[]): string {
  if (Array.isArray(country)) {
    return JSON.stringify(country);
  }
  return country;
}

/** Parse country field from database (JSON string → string or string[]) */
export function parseCountry(country: string): string | string[] {
  if (!country) return country;
  if (country.startsWith("[")) {
    try {
      const parsed = JSON.parse(country);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not valid JSON, return as-is
    }
  }
  return country;
}

// ─── Entry SQL Fragments ─────────────────────────────────────────────────────

/** Base SELECT for entries with author info and aggregated images */
const ENTRY_SELECT = `
  SELECT 
    e.id,
    e.category,
    e.priority,
    e.region,
    e.country,
    e.headline,
    e.date,
    e.entry,
    e.source_name as "sourceName",
    e.source_url as "sourceUrl",
    e.source_date as "sourceDate",
    e.pu_note as "puNote",
    COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') as author,
    e.author_id as "authorId",
    u.email as "authorEmail",
    e.comment,
    e.status,
    e.ai_summary as "aiSummary",
    COALESCE(e.approval_status, 'pending') as "approvalStatus",
    e.previous_entry_id as "previousEntryId",
    COALESCE(
      json_agg(
        json_build_object(
          'id', i.id,
          'entryId', i.entry_id,
          'filename', i.filename,
          'mimeType', i.mime_type,
          'blobUrl', i.blob_url,
          'width', i.width,
          'height', i.height,
          'position', i.position
        ) ORDER BY i.position NULLS LAST
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'
    ) as images
  FROM pu_morning_briefings.entries e
  LEFT JOIN pu_morning_briefings.users u ON e.author_id = u.id
  LEFT JOIN pu_morning_briefings.images i ON e.id = i.entry_id`;

/** Fetch a single entry by ID with images and author info */
export async function fetchEntryById(id: string) {
  const result = await query(
    `${ENTRY_SELECT} WHERE e.id = $1 GROUP BY e.id, u.id`,
    [id],
  );
  if (result.rows.length === 0) return null;

  return {
    ...result.rows[0],
    country: parseCountry(result.rows[0].country),
  };
}

/** Fetch entries with optional filters, returning raw rows with parsed country */
export async function fetchEntries(filters: {
  date?: string | null;
  status?: string | null;
  author?: string | null;
}) {
  const params: any[] = [];
  const conditions: string[] = [];

  if (filters.date) {
    conditions.push(`DATE(e.date) = $${params.length + 1}`);
    params.push(filters.date);
  }
  if (filters.status) {
    conditions.push(`e.status = $${params.length + 1}`);
    params.push(filters.status);
  }
  if (filters.author) {
    conditions.push(
      `(u.email = $${params.length + 1} OR CONCAT(u.first_name, ' ', u.last_name) = $${params.length + 1})`,
    );
    params.push(filters.author);
  }

  let sql = ENTRY_SELECT;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += ` GROUP BY e.id, u.id ORDER BY e.date DESC`;

  const result = await query(sql, params);
  return result.rows.map((row) => ({
    ...row,
    country: parseCountry(row.country),
  }));
}

/** Look up author_id from a user's email */
export async function getAuthorId(email: string): Promise<number | null> {
  const result = await query(
    `SELECT id FROM pu_morning_briefings.users WHERE email = $1`,
    [email],
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}
