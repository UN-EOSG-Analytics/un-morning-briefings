/**
 * Shared entry query utilities for API routes.
 * Eliminates duplication of SQL queries, country serialization, and entry fetching.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { query } from "@/lib/db";
import type { EntrySource } from "@/types/morning-meeting";

// ─── URL Sanitization ───────────────────────────────────────────────────────

/** Strip URLs with non-http(s) protocols (e.g. javascript:) to prevent XSS. */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return null;
}

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

// ─── Sources Serialization ──────────────────────────────────────────────────

export function serializeSources(sources: EntrySource[] | undefined | null): string | null {
  if (!sources || sources.length === 0) return null;
  return JSON.stringify(
    sources.map((s) => ({
      name: s.name || null,
      url: sanitizeUrl(s.url) || null,
      date: s.date || null,
    })),
  );
}

export function parseSources(value: unknown): EntrySource[] | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) return value;
  return undefined;
}

export function legacyToSources(row: {
  sourceName?: string | string[] | null;
  sourceUrl?: string | null;
  sourceDate?: string | null;
}): EntrySource[] | undefined {
  const names = row.sourceName
    ? Array.isArray(row.sourceName)
      ? row.sourceName
      : typeof row.sourceName === "string" && row.sourceName.startsWith("[")
        ? (() => { try { return JSON.parse(row.sourceName); } catch { return [row.sourceName]; } })()
        : [row.sourceName]
    : [];
  if (names.length === 0 && !row.sourceUrl && !row.sourceDate) return undefined;
  if (names.length === 0) {
    return [{ url: row.sourceUrl || undefined, date: row.sourceDate || undefined }];
  }
  return names.map((name: string, i: number) => ({
    name,
    url: i === 0 ? row.sourceUrl || undefined : undefined,
    date: i === 0 ? row.sourceDate || undefined : undefined,
  }));
}

// ─── Entry SQL Fragments ─────────────────────────────────────────────────────

/** Base SELECT for entries with author info and aggregated images */
const ENTRY_SELECT_FULL = `
  SELECT
    e.id,
    e.category,
    e.priority,
    e.region,
    e.country,
    e.headline,
    e.date,
    e.entry,
    e.sources,
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
    COALESCE(e.discussion_status, 'pending') as "discussionStatus",
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

/** Lightweight SELECT that omits heavy text columns (entry, puNote, aiSummary) */
const ENTRY_SELECT_LITE = `
  SELECT
    e.id,
    e.category,
    e.priority,
    e.region,
    e.country,
    e.headline,
    e.date,
    e.sources,
    e.source_name as "sourceName",
    e.source_url as "sourceUrl",
    e.source_date as "sourceDate",
    e.thematic,
    COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') as author,
    e.author_id as "authorId",
    u.email as "authorEmail",
    e.comment,
    e.status,
    COALESCE(e.discussion_status, 'pending') as "discussionStatus",
    e.previous_entry_id as "previousEntryId",
    e.created_at as "createdAt",
    e.updated_at as "updatedAt"
  FROM morning_briefings.entries e
  LEFT JOIN morning_briefings.users u ON e.author_id = u.id`;

/** Fetch a single entry by ID with images and author info */
export async function fetchEntryById(id: string) {
  const result = await query(
    `${ENTRY_SELECT_FULL} WHERE e.id = $1 GROUP BY e.id, u.id`,
    [id],
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const parsedSourceName = row.sourceName ? parseStringOrArray(row.sourceName) : row.sourceName;
  return {
    ...row,
    country: parseStringOrArray(row.country),
    thematic: row.thematic ? parseStringOrArray(row.thematic) : row.thematic,
    sources: parseSources(row.sources) ?? legacyToSources({ sourceName: parsedSourceName, sourceUrl: row.sourceUrl, sourceDate: row.sourceDate }),
    sourceName: parsedSourceName,
  };
}

/** Fetch entries with optional filters, returning raw rows with parsed country.
 *  Pass `lite: true` to omit heavy text columns (entry, puNote, aiSummary, images). */
export async function fetchEntries(filters: {
  date?: string | null;
  status?: string | null;
  author?: string | null;
  search?: string | null;
  lite?: boolean;
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
  if (filters.search) {
    conditions.push(`e.search_vector @@ websearch_to_tsquery('english', $${params.length + 1})`);
    params.push(filters.search);
  }

  const base = filters.lite ? ENTRY_SELECT_LITE : ENTRY_SELECT_FULL;
  let sql = base;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  if (!filters.lite) {
    sql += ` GROUP BY e.id, u.id`;
  }
  sql += ` ORDER BY e.date DESC`;

  const result = await query(sql, params);
  return result.rows.map((row) => {
    const parsedSourceName = row.sourceName ? parseStringOrArray(row.sourceName) : row.sourceName;
    return {
      ...row,
      country: parseStringOrArray(row.country),
      thematic: row.thematic ? parseStringOrArray(row.thematic) : row.thematic,
      sources: parseSources(row.sources) ?? legacyToSources({ sourceName: parsedSourceName, sourceUrl: row.sourceUrl, sourceDate: row.sourceDate }),
      sourceName: parsedSourceName,
    };
  });
}

/** Fetch all submitted entries for a specific briefing date using the 8AM cutoff window.
 *  Briefing for date X includes entries from the previous working day at 08:00 to X at 08:00.
 *  For Monday briefings, the window starts on Friday at 08:00 (spanning the weekend). */
export async function fetchEntriesForBriefingDate(briefingDate: string) {
  const [year, month, day] = briefingDate.split("-").map(Number);
  const briefingDateObj = new Date(year, month - 1, day);
  const dayOfWeek = briefingDateObj.getDay(); // 0=Sun, 1=Mon, ...

  // How many calendar days to go back to find the previous working day's 8AM:
  // Monday (1) → go back 3 days to Friday; all other weekdays → go back 1 day.
  const daysBack = dayOfWeek === 1 ? 3 : 1;

  const startDate = new Date(year, month - 1, day - daysBack);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();

  const start = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}T08:00`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T08:00`;

  const sql = `${ENTRY_SELECT_FULL}
    WHERE e.date >= $1 AND e.date < $2
      AND e.status = 'submitted'
    GROUP BY e.id, u.id
    ORDER BY e.date DESC`;

  const result = await query(sql, [start, end]);
  return result.rows.map((row) => {
    const parsedSourceName = row.sourceName ? parseStringOrArray(row.sourceName) : row.sourceName;
    return {
      ...row,
      country: parseStringOrArray(row.country),
      thematic: row.thematic ? parseStringOrArray(row.thematic) : row.thematic,
      sources: parseSources(row.sources) ?? legacyToSources({ sourceName: parsedSourceName, sourceUrl: row.sourceUrl, sourceDate: row.sourceDate }),
      sourceName: parsedSourceName,
    };
  });
}

/** Look up author_id from a user's email */
export async function getAuthorId(email: string): Promise<number | null> {
  const result = await query(
    `SELECT id FROM morning_briefings.users WHERE email = $1`,
    [email],
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}
