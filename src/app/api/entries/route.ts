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
    const author = searchParams.get("author");
    const noConvert = searchParams.get("noConvert") === "true"; // Skip image conversion for list views

    console.log("GET /api/entries: Params -", {
      date,
      status,
      author,
      noConvert,
    });

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
        e.author,
        e.status,
        e.ai_summary as "aiSummary",
        e.approval_status as "approvalStatus",
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
      conditions.push(`e.author = $${params.length + 1}`);
      params.push(author);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` GROUP BY e.id ORDER BY e.date DESC`;

    console.log("GET /api/entries: Executing SQL with params:", {
      sql,
      params,
    });
    const result = await query(sql, params);
    console.log("GET /api/entries: Query returned", result.rows.length, "rows");

    // Parse country field for all entries
    const entries = result.rows.map((row) => ({
      ...row,
      country: parseCountry(row.country),
    }));

    // Skip image conversion for list views (performance optimization)
    if (noConvert) {
      console.log(
        "GET /api/entries: Skipping image conversion (noConvert=true)",
      );
      return NextResponse.json(entries, {
        headers: {
          "Cache-Control": "private, max-age=5", // 5 second cache
        },
      });
    }

    // Convert blob URLs to data URLs for private blob storage
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0) {
        console.log(
          `GET /api/entries: Processing ${entry.images.length} images for entry ${entry.id}`,
        );
        entry.entry = await convertImageReferencesServerSide(
          entry.entry,
          entry.images,
          blobStorage,
          "GET /api/entries",
        );
      }
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Check if it's a database connection error
    const isDatabaseError =
      errorMessage.includes("connect") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("FATAL") ||
      errorMessage.includes("password");

    console.error("Error details:", {
      message: errorMessage,
      isDatabaseError,
      stack: errorStack,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch entries",
        details: errorMessage,
        isDatabaseError,
        hint: isDatabaseError ? "Check DATABASE_URL in .env.local" : undefined,
      },
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

    console.log(
      "POST /api/entries: Received request with",
      images?.length || 0,
      "images",
    );
    console.log(
      "POST /api/entries: Entry content length:",
      entryContent?.length,
    );

    // Upload images to blob storage
    const uploadedImages = [];
    if (images && images.length > 0) {
      console.log("POST /api/entries: Starting image upload to blob storage");
      for (const img of images) {
        try {
          console.log(
            `POST /api/entries: Uploading image ${img.filename} (${img.mimeType}), position: ${img.position}`,
          );
          const buffer = Buffer.from(img.data, "base64");
          const result = await blobStorage.upload(
            buffer,
            img.filename,
            img.mimeType,
          );
          console.log(
            `POST /api/entries: Successfully uploaded to ${result.url}`,
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
          // Continue with other images, skip this one
        }
      }
      console.log(
        "POST /api/entries: Uploaded",
        uploadedImages.length,
        "images successfully",
      );
    }

    // Generate ID
    const id = crypto.randomUUID();
    const now = new Date();

    // Insert entry
    // Store date as-is without timezone conversion
    await query(
      `INSERT INTO pu_morning_briefings.entries (
        id, category, priority, region, country, headline, date, entry,
        source_name, source_url, source_date, pu_note, author, status, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
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
        data.author || null,
        data.status || null,
        "pending",
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

    // Fetch created entry with images
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
        e.author,
        e.status,
        COALESCE(e.approval_status, 'pending') as "approvalStatus",
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
      LEFT JOIN pu_morning_briefings.images i ON e.id = i.entry_id
      WHERE e.id = $1
      GROUP BY e.id`,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
    });
    return NextResponse.json(
      {
        error: "Failed to create entry",
        details: errorMessage,
      },
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
    const { id, approvalStatus, aiSummary, action } = body;

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
      !["pending", "discussed", "left-out"].includes(approvalStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid approval status" },
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

    // Fetch updated entry
    const result = await query(
      `SELECT 
        id,
        category,
        priority,
        region,
        country,
        headline,
        date,
        entry,
        source_name as "sourceName",
        source_url as "sourceUrl",
        source_date as "sourceDate",
        pu_note as "puNote",
        author,
        status,
        ai_summary as "aiSummary",
        COALESCE(approval_status, 'pending') as "approvalStatus"
      FROM pu_morning_briefings.entries
      WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating entry:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update entry",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
