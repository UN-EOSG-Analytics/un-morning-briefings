/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

// Helper function to serialize country field for database storage
function serializeCountry(country: string | string[]): string {
  if (Array.isArray(country)) {
    return JSON.stringify(country);
  }
  return country;
}

/**
 * POST /api/entries/import
 * Import entries from a backup JSON file
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Invalid request: entries array is required" },
        { status: 400 },
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      try {
        // Check if entry already exists (by id or by headline+date)
        const existingCheck = await query(
          `SELECT id FROM pu_morning_briefings.entries 
           WHERE id = $1 OR (headline = $2 AND date = $3)`,
          [entry.id, entry.headline, entry.date],
        );

        if (existingCheck.rows.length > 0) {
          skipped++;
          continue;
        }

        // Look up author_id by email (from entry or current user)
        let authorId: number | null = null;
        const authorEmail = entry.authorEmail || auth.session?.user?.email;
        if (authorEmail) {
          const userResult = await query(
            `SELECT id FROM pu_morning_briefings.users WHERE email = $1`,
            [authorEmail]
          );
          if (userResult.rows.length > 0) {
            authorId = userResult.rows[0].id;
          }
        }

        // Insert the entry with author_id foreign key
        await query(
          `INSERT INTO pu_morning_briefings.entries (
            id, category, priority, region, country, headline, date, entry,
            source_name, source_url, source_date, pu_note, author_id, status, ai_summary, approval_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            entry.id,
            entry.category,
            entry.priority,
            entry.region,
            serializeCountry(entry.country),
            entry.headline,
            entry.date,
            entry.entry,
            entry.sourceName || null,
            entry.sourceUrl || null,
            entry.sourceDate || null,
            entry.puNote || null,
            authorId,
            entry.status || "draft",
            entry.aiSummary || null,
            entry.approvalStatus || "pending",
          ],
        );

        // Import images if they exist (Note: image blobs won't be restored, only metadata)
        if (
          entry.images &&
          Array.isArray(entry.images) &&
          entry.images.length > 0
        ) {
          for (const image of entry.images) {
            // Skip if image data is missing (we can't restore blob data from JSON)
            if (!image.blobUrl) continue;

            await query(
              `INSERT INTO pu_morning_briefings.images (
                id, entry_id, filename, mime_type, blob_url, width, height, position
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO NOTHING`,
              [
                image.id,
                entry.id,
                image.filename,
                image.mimeType,
                image.blobUrl,
                image.width || null,
                image.height || null,
                image.position ?? null,
              ],
            );
          }
        }

        imported++;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        errors.push(`Entry "${entry.headline}": ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing entries:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to import entries",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
