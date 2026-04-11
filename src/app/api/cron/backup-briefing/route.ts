import { NextRequest, NextResponse } from "next/server";
import { fetchEntriesForBriefingDate } from "@/lib/entry-queries";
import { convertImageReferencesServerSide } from "@/lib/image-conversion";
import { blobStorage } from "@/lib/blob-storage";
import { generateDocumentBuffer } from "@/lib/briefing-docx";

export const maxDuration = 60;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const BLOB_PREFIX = "briefing-backup";

/**
 * Get today's date string in America/New_York timezone.
 * Vercel runs in UTC, so we need explicit timezone conversion.
 */
function getTodayNYC(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}


export async function GET(request: NextRequest) {
  try {
    // Authenticate: Vercel sends Authorization header for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[BACKUP] CRON_SECRET not configured");
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const briefingDate = getTodayNYC();
    console.log(`[BACKUP] Generating DOCX backup for ${briefingDate}`);

    // Fetch entries for this briefing date
    const entries = await fetchEntriesForBriefingDate(briefingDate);

    if (entries.length === 0) {
      console.log(`[BACKUP] No entries for ${briefingDate}, skipping`);
      return NextResponse.json({
        skipped: true,
        reason: "no entries",
        briefingDate,
      });
    }

    // Convert image references to data URLs for DOCX embedding
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0 && entry.entry) {
        entry.entry = await convertImageReferencesServerSide(
          entry.entry,
          entry.images,
          blobStorage,
          "cron/backup-briefing",
        );
      }
    }

    // Generate DOCX
    const buffer = await generateDocumentBuffer(entries, briefingDate);
    const blobName = `${BLOB_PREFIX}/${briefingDate}.docx`;

    // Upload (overwrites previous version for today)
    const result = await blobStorage.uploadFixed(buffer, blobName, DOCX_MIME);
    console.log(`[BACKUP] Uploaded ${blobName} (${buffer.length} bytes)`);

    return NextResponse.json({
      success: true,
      briefingDate,
      entryCount: entries.length,
      blobUrl: result.url,
    });
  } catch (error) {
    console.error("[BACKUP] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
