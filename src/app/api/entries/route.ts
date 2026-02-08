/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { blobStorage } from "@/lib/blob-storage";
import { convertImageReferencesServerSide } from "@/lib/image-conversion";
import { checkAuth } from "@/lib/auth-helper";

// Helper function to serialize country field for database storage
function serializeCountry(country: string | string[]): string {
  if (Array.isArray(country)) {
    return JSON.stringify(country);
  }
  return country;
}

// Helper function to parse country field from database
function parseCountry(country: string): string | string[] {
  if (!country) return country;
  // Try to parse as JSON array
  if (country.startsWith("[")) {
    try {
      const parsed = JSON.parse(country);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Not valid JSON, return as is
    }
  }
  return country;
}

/**
 * GET /api/entries
 * Fetch entries with optional filters for date, status, and author
 * Automatically converts image-ref:// to data URLs before sending response
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const author = searchParams.get("author"); // Can be email or name
    const noConvert = searchParams.get("noConvert") === "true";

    let sql = `
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
        e.approval_status as "approvalStatus",
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
      LEFT JOIN pu_morning_briefings.images i ON e.id = i.entry_id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (date) {
      conditions.push(`DATE(e.date) = $${params.length + 1}`);
      params.push(date);
    }

    if (status) {
      conditions.push(`e.status = $${params.length + 1}`);
      params.push(status);
    }

    if (author) {
      // Support filtering by email (for profile/drafts pages) or by user id
      conditions.push(`(u.email = $${params.length + 1} OR CONCAT(u.first_name, ' ', u.last_name) = $${params.length + 1})`);
      params.push(author);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` GROUP BY e.id, u.id ORDER BY e.date DESC`;

    const result = await query(sql, params);

    // Parse country field for all entries
    const entries = result.rows.map((row) => ({
      ...row,
      country: parseCountry(row.country),
    }));

    // Skip image conversion for list views (performance optimization)
    if (noConvert) {
      return NextResponse.json(entries, {
        headers: { "Cache-Control": "private, max-age=5" },
      });
    }

    // Convert blob URLs to data URLs for private blob storage
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0) {
        entry.entry = await convertImageReferencesServerSide(
          entry.entry,
          entry.images,
          blobStorage,
        );
      }
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/entries
 * Create a new entry with image uploads to blob storage
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { entry: entryContent, images, ...data } = body;

    // Upload images to blob storage
    const uploadedImages = [];
    if (images && images.length > 0) {
      for (const img of images) {
        try {
          const buffer = Buffer.from(img.data, "base64");
          const result = await blobStorage.upload(
            buffer,
            img.filename,
            img.mimeType,
          );
          uploadedImages.push({
            filename: result.filename,
            mimeType: result.mimeType,
            blobUrl: result.url,
            width: img.width,
            height: img.height,
            position: img.position,
          });
        } catch (error) {
          console.error(`Error uploading image ${img.filename}:`, error);
        }
      }
    }

    // Generate ID
    const id = crypto.randomUUID();
    const now = new Date();

    // Look up author_id from session user email
    let authorId: number | null = null;
    const userEmail = auth.session?.user?.email;
    if (userEmail) {
      const userResult = await query(
        `SELECT id FROM pu_morning_briefings.users WHERE email = $1`,
        [userEmail]
      );
      if (userResult.rows.length > 0) {
        authorId = userResult.rows[0].id;
      }
    }

    // Insert entry with author_id foreign key
    // Store date as-is without timezone conversion
    await query(
      `INSERT INTO pu_morning_briefings.entries (
        id, category, priority, region, country, headline, date, entry,
        source_name, source_url, source_date, pu_note, author_id, status, approval_status, previous_entry_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        data.category,
        data.priority,
        data.region,
        serializeCountry(data.country),
        data.headline,
        data.date, // Store as string, no Date conversion
        entryContent,
        data.sourceName || null,
        data.sourceUrl || null,
        data.sourceDate || null,
        data.puNote || null,
        authorId,
        data.status || null,
        "pending",
        data.previousEntryId || null,
      ],
    );

    // Insert images if any
    if (uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        await query(
          `INSERT INTO pu_morning_briefings.images (
            id, entry_id, filename, mime_type, blob_url, width, height, position
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            id,
            img.filename,
            img.mimeType,
            img.blobUrl,
            img.width ?? null,
            img.height ?? null,
            img.position ?? null,
          ],
        );
      }
    }

    // Fetch created entry with images and author info
    const result = await query(
      `SELECT 
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
        e.status,
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
      LEFT JOIN pu_morning_briefings.images i ON e.id = i.entry_id
      WHERE e.id = $1
      GROUP BY e.id, u.id`,
      [id],
    );

    const createdEntry = {
      ...result.rows[0],
      country: parseCountry(result.rows[0].country),
    };
    createdEntry.entry = await convertImageReferencesServerSide(
      createdEntry.entry,
      createdEntry.images,
      blobStorage,
      "POST /api/entries",
    );

    return NextResponse.json(createdEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/entries
 * Update entry approval status
 */
export async function PATCH(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { id, approvalStatus, aiSummary, action, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Build update query based on what fields are provided
    if (
      approvalStatus &&
      !["pending", "discussed"].includes(approvalStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid approval status" },
        { status: 400 },
      );
    }

    if (status && !["draft", "submitted"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 },
      );
    }

    let updateQuery = "UPDATE pu_morning_briefings.entries SET";
    const params: any[] = [];
    let paramIndex = 1;
    const updateParts: string[] = [];

    // Handle postpone action: set status to pending and advance date by 1 day
    if (action === "postpone") {
      updateParts.push(`approval_status = $${paramIndex}`);
      params.push("pending");
      paramIndex++;

      updateParts.push(`date = (date + INTERVAL '1 day')`);
    } else {
      if (status) {
        updateParts.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (approvalStatus) {
        updateParts.push(`approval_status = $${paramIndex}`);
        params.push(approvalStatus);
        paramIndex++;
      }

      if (aiSummary !== undefined) {
        updateParts.push(`ai_summary = $${paramIndex}`);
        params.push(aiSummary ? JSON.stringify(aiSummary) : null);
        paramIndex++;
      }
    }

    if (updateParts.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    updateQuery += ` ${updateParts.join(", ")} WHERE id = $${paramIndex}`;
    params.push(id);

    // Update entry
    await query(updateQuery, params);

    // Fetch updated entry with author info
    const result = await query(
      `SELECT 
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
        e.status,
        e.ai_summary as "aiSummary",
        COALESCE(e.approval_status, 'pending') as "approvalStatus",
        e.previous_entry_id as "previousEntryId"
      FROM pu_morning_briefings.entries e
      LEFT JOIN pu_morning_briefings.users u ON e.author_id = u.id
      WHERE e.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 },
    );
  }
}
