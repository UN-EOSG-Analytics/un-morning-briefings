/**
 * Shared entry query utilities for API routes.
 * Eliminates duplication of SQL queries, country serialization, and entry fetching.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { query } from "@/lib/db";

// ─── HTML → Plain Text ──────────────────────────────────────────────────────

/** Strip HTML tags from entry content and return clean plain text.
 *  Used to populate the `text_content` column for FTS and future embeddings. */
export function stripHtmlToText(html: string): string {
  let text = html;
  // Remove <img> tags entirely (they carry image-ref:// URLs, no useful text)
  text = text.replace(/<img[^>]*>/gi, "");
  // Replace block-level closing tags and line-break elements with spaces
  text = text.replace(
    /<\/(p|li|h[1-6]|blockquote|div|tr|td|th)>|<br\s*\/?>|<hr\s*\/?>/gi,
    " ",
  );
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace and trim
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

// ─── String / Array Serialization ───────────────────────────────────────────

/** Serialize a string-or-array field for DB storage (array → JSON string) */
export function serializeStringOrArray(value: string | string[]): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return value;
}

/** Parse a DB string that may be a JSON array back to string | string[] */
export function parseStringOrArray(value: string): string | string[] {
  if (!value) return value;
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not valid JSON, return as-is
    }
  }
  return value;
}

// Keep named aliases for clarity at call sites
export const serializeCountry = serializeStringOrArray;
export const parseCountry = parseStringOrArray;

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
    e.thematic,
    COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') as author,
    e.author_id as "authorId",
    u.email as "authorEmail",
    e.comment,
    e.status,
    e.ai_summary as "aiSummary",
    COALESCE(e.approval_status, 'pending') as "approvalStatus",
    e.previous_entry_id as "previousEntryId",
    e.created_at as "createdAt",
    e.updated_at as "updatedAt",
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
  FROM morning_briefings.entries e
  LEFT JOIN morning_briefings.users u ON e.author_id = u.id
  LEFT JOIN morning_briefings.images i ON e.id = i.entry_id`;

/** Fetch a single entry by ID with images and author info */
export async function fetchEntryById(id: string) {
  const result = await query(
    `${ENTRY_SELECT} WHERE e.id = $1 GROUP BY e.id, u.id`,
    [id],
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    country: parseStringOrArray(row.country),
    thematic: row.thematic ? parseStringOrArray(row.thematic) : row.thematic,
    sourceName: row.sourceName
      ? parseStringOrArray(row.sourceName)
      : row.sourceName,
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
    country: parseStringOrArray(row.country),
    thematic: row.thematic ? parseStringOrArray(row.thematic) : row.thematic,
    sourceName: row.sourceName
      ? parseStringOrArray(row.sourceName)
      : row.sourceName,
  }));
}

/** Look up author_id from a user's email */
export async function getAuthorId(email: string): Promise<number | null> {
  const result = await query(
    `SELECT id FROM morning_briefings.users WHERE email = $1`,
    [email],
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}
