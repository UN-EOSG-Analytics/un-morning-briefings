/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { blobStorage } from "@/lib/blob-storage";
import { convertImageReferencesServerSide } from "@/lib/image-conversion";
import { checkAuth } from "@/lib/auth-helper";
import {
  serializeCountry,
  serializeStringOrArray,
  stripHtmlToText,
  sanitizeUrl,
  fetchEntries,
  fetchEntryById,
  getAuthorId,
} from "@/lib/entry-queries";
import { sanitizeHtml } from "@/lib/sanitize";
import labels from "@/lib/labels.json";

const VALID_CATEGORIES = (labels as any).categories as string[];
const VALID_PRIORITIES = (
  (labels as any).priorities as { value: string }[]
).map((p) => p.value);
const VALID_REGIONS = (labels as any).regions as string[];
const VALID_STATUSES = ["draft", "submitted"];

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
    const noConvert = searchParams.get("noConvert") === "true";

    const entries = await fetchEntries({ date, status, author });

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
      { error: labels.entries.errors.fetchFailed },
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

    // Validate domain values
    if (data.category && !VALID_CATEGORIES.includes(data.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    if (data.region && !VALID_REGIONS.includes(data.region)) {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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

    // Sanitize HTML content before storage
    const sanitizedEntry = entryContent ? sanitizeHtml(entryContent) : entryContent;
    const sanitizedPuNote = data.puNote ? sanitizeHtml(data.puNote) : data.puNote;

    // Generate ID
    const id = crypto.randomUUID();
    const now = new Date();

    // Look up author_id from session user email
    const userEmail = auth.session?.user?.email;
    const authorId = userEmail ? await getAuthorId(userEmail) : null;

    // Insert entry with author_id foreign key
    // Store date as-is without timezone conversion
    const textContent = stripHtmlToText(sanitizedEntry);
    await query(
      `INSERT INTO morning_briefings.entries (
        id, category, priority, region, country, headline, date, entry,
        source_name, source_url, source_date, pu_note, thematic, author_id, status, discussion_status, previous_entry_id, text_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        id,
        data.category,
        data.priority,
        data.region,
        serializeCountry(data.country),
        data.headline,
        data.date, // Store as string, no Date conversion
        sanitizedEntry,
        data.sourceName ? serializeStringOrArray(data.sourceName) : null,
        sanitizeUrl(data.sourceUrl),
        data.sourceDate || null,
        sanitizedPuNote || null,
        data.thematic ? serializeStringOrArray(data.thematic) : null,
        authorId,
        data.status || null,
        "pending",
        data.previousEntryId || null,
        textContent,
      ],
    );

    // Insert images if any
    if (uploadedImages.length > 0) {
      for (const img of uploadedImages) {
        await query(
          `INSERT INTO morning_briefings.images (
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
    const createdEntry = await fetchEntryById(id);
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
      { error: labels.entries.errors.createFailed },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/entries
 * Update entry discussion status
 */
export async function PATCH(request: NextRequest) {
  // Check authentication
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { id, discussionStatus, aiSummary, action, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: labels.entries.errors.idRequired },
        { status: 400 },
      );
    }

    // Build update query based on what fields are provided
    if (discussionStatus && !["pending", "discussed"].includes(discussionStatus)) {
      return NextResponse.json(
        { error: (labels as any).entries.errors.invalidDiscussionStatus },
        { status: 400 },
      );
    }

    if (status && !["draft", "submitted"].includes(status)) {
      return NextResponse.json(
        { error: labels.entries.errors.invalidStatus },
        { status: 400 },
      );
    }

    let updateQuery = "UPDATE morning_briefings.entries SET";
    const params: any[] = [];
    let paramIndex = 1;
    const updateParts: string[] = [];

    // Handle postpone action: set status to pending and advance date by 1 day
    if (action === "postpone") {
      updateParts.push(`discussion_status = $${paramIndex}`);
      params.push("pending");
      paramIndex++;

      updateParts.push(`date = (date + INTERVAL '1 day')`);
    } else {
      if (status) {
        updateParts.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (discussionStatus) {
        updateParts.push(`discussion_status = $${paramIndex}`);
        params.push(discussionStatus);
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
        { error: labels.entries.errors.noFieldsToUpdate },
        { status: 400 },
      );
    }

    updateQuery += ` ${updateParts.join(", ")} WHERE id = $${paramIndex}`;
    params.push(id);

    // Update entry
    await query(updateQuery, params);

    // Fetch updated entry with author info
    const entry = await fetchEntryById(id);
    if (!entry) {
      return NextResponse.json(
        { error: labels.entries.errors.notFound },
        { status: 404 },
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json(
      { error: labels.entries.errors.updateFailed },
      { status: 500 },
    );
  }
}
