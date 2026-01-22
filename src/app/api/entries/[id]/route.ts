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
 * GET /api/entries/[id]
 * Fetch a single entry by ID with image conversion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;
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
        e.source_url as "sourceUrl",
        e.source_date as "sourceDate",
        e.pu_note as "puNote",
        e.author,
        e.status,
        e.approval_status as "approvalStatus",
        e.ai_summary as "aiSummary",
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

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = result.rows[0];

    // Convert blob URLs to data URLs for private blob storage
    if (entry.images && entry.images.length > 0) {
      entry.entry = await convertImageReferencesServerSide(
        entry.entry,
        entry.images,
        blobStorage,
        "GET /api/entries/[id]",
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error fetching entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch entry" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/entries/[id]
 * Update an entry and handle image replacements
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { entry: entryContent, images, ...data } = body;

    console.log("PUT /api/entries/[id] - Entry ID:", id);
    console.log("PUT /api/entries/[id] - Body keys:", Object.keys(body));
    console.log("PUT /api/entries/[id] - Data:", JSON.stringify(data, null, 2));

    // Delete existing images from blob storage and database if new ones are provided
    if (images) {
      const existingImagesResult = await query(
        `SELECT id, blob_url FROM pu_morning_briefings.images WHERE entry_id = $1`,
        [id],
      );

      // Delete from blob storage
      for (const img of existingImagesResult.rows) {
        try {
          await blobStorage.delete(img.blob_url);
        } catch (error) {
          console.error("Error deleting blob:", error);
        }
      }

      // Delete from database
      await query(
        `DELETE FROM pu_morning_briefings.images WHERE entry_id = $1`,
        [id],
      );
    }

    // Upload new images to blob storage
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
          // Continue with other images, skip this one
        }
      }
    }

    // Update entry
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (data.category !== undefined) {
      updateFields.push(`category = $${paramCount++}`);
      updateValues.push(data.category);
    }
    if (data.priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      updateValues.push(data.priority);
    }
    if (data.region !== undefined) {
      updateFields.push(`region = $${paramCount++}`);
      updateValues.push(data.region);
    }
    if (data.country !== undefined) {
      updateFields.push(`country = $${paramCount++}`);
      updateValues.push(serializeCountry(data.country));
    }
    if (data.headline !== undefined) {
      updateFields.push(`headline = $${paramCount++}`);
      updateValues.push(data.headline);
    }
    if (data.date !== undefined) {
      updateFields.push(`date = $${paramCount++}`);
      updateValues.push(data.date); // Store as string, no Date conversion
    }
    if (entryContent !== undefined) {
      updateFields.push(`entry = $${paramCount++}`);
      updateValues.push(entryContent);
    }
    if (data.sourceUrl !== undefined) {
      updateFields.push(`source_url = $${paramCount++}`);
      updateValues.push(data.sourceUrl);
    }
    if (data.sourceDate !== undefined) {
      updateFields.push(`source_date = $${paramCount++}`);
      updateValues.push(data.sourceDate || null); // Convert empty string to null
    }
    if (data.puNote !== undefined) {
      updateFields.push(`pu_note = $${paramCount++}`);
      updateValues.push(data.puNote);
    }
    if (data.author !== undefined) {
      updateFields.push(`author = $${paramCount++}`);
      updateValues.push(data.author);
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(data.status);
    }
    if (data.approvalStatus !== undefined) {
      updateFields.push(`approval_status = $${paramCount++}`);
      updateValues.push(data.approvalStatus);
    }
    if (data.aiSummary !== undefined) {
      updateFields.push(`ai_summary = $${paramCount++}`);
      updateValues.push(data.aiSummary ? JSON.stringify(data.aiSummary) : null);
    }

    updateValues.push(id);

    if (updateFields.length > 0) {
      await query(
        `UPDATE pu_morning_briefings.entries SET ${updateFields.join(", ")} WHERE id = $${paramCount}`,
        updateValues,
      );
    }

    // Insert new images if any
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

    // Fetch updated entry with images
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
        e.source_url as "sourceUrl",
        COALESCE(e.source_date, NULL) as "sourceDate",
        e.pu_note as "puNote",
        e.author,
        e.status,
        e.approval_status as "approvalStatus",
        e.ai_summary as "aiSummary",
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

    const entry = {
      ...result.rows[0],
      country: parseCountry(result.rows[0].country),
    };

    // Convert blob URLs to data URLs for private blob storage
    if (entry.images && entry.images.length > 0) {
      entry.entry = await convertImageReferencesServerSide(
        entry.entry,
        entry.images,
        blobStorage,
        "PUT /api/entries/[id]",
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating entry:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update entry",
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/entries/[id]
 * Delete an entry and its associated images
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { id } = await params;

    // Delete images from blob storage first
    const existingImagesResult = await query(
      `SELECT id, blob_url FROM pu_morning_briefings.images WHERE entry_id = $1`,
      [id],
    );

    for (const img of existingImagesResult.rows) {
      try {
        await blobStorage.delete(img.blob_url);
      } catch (error) {
        console.error("Error deleting blob:", error);
      }
    }

    // Delete entry (will cascade delete images from database)
    const deleteResult = await query(
      `DELETE FROM pu_morning_briefings.entries WHERE id = $1 RETURNING id`,
      [id],
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entry:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to delete entry",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
