import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fetchEntriesForBriefingDate } from "@/lib/entry-queries";
import { convertImageReferencesServerSide } from "@/lib/image-conversion";
import { blobStorage } from "@/lib/blob-storage";
import { generateDocumentBuffer, formatExportFilename } from "@/lib/briefing-docx";
import { formatDateLong } from "@/lib/format-date";
import {
  sendEmail,
  resolveRecipients,
  buildBriefingEmailBody,
} from "@/lib/email-service";

export const maxDuration = 60;

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
  // en-CA gives YYYY-MM-DD format
  return formatter.format(new Date());
}

/**
 * Get the current hour and minute in America/New_York timezone.
 * Uses "2-digit" + hour12:false to avoid the "24" edge case some engines
 * produce with "numeric" at midnight.
 */
function getNycTime(): { hour: number; minute: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")!.value);
  const minute = parseInt(parts.find((p) => p.type === "minute")!.value);
  return { hour: hour === 24 ? 0 : hour, minute };
}

/**
 * Log the send attempt to the email_send_log table.
 */
async function logSend(
  recipients: string[],
  status: "success" | "failed",
  briefingDate: string,
  errorMsg?: string,
) {
  try {
    await query(
      `INSERT INTO morning_briefings.email_send_log
         (recipients, status, error_msg, briefing_date, triggered_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        JSON.stringify(recipients),
        status,
        errorMsg ?? null,
        briefingDate,
        "cron",
      ],
    );
  } catch (err) {
    console.error("[CRON] Failed to write send log:", err);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate: Vercel sends Authorization header for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[CRON] CRON_SECRET not configured");
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DST-safe: two crons fire at 11:45 and 12:45 UTC. Only proceed if
    // it's >= 7:45 AM in NYC. The duplicate guard handles the second hit.
    const { hour, minute } = getNycTime();
    if (hour < 7 || (hour === 7 && minute < 45)) {
      console.log(`[CRON] Too early in NYC (${hour}:${String(minute).padStart(2, "0")}), skipping`);
      return NextResponse.json({
        skipped: true,
        reason: "too early in NYC",
        nycTime: `${hour}:${String(minute).padStart(2, "0")}`,
      });
    }

    // Compute today's briefing date in NYC timezone
    const briefingDate = getTodayNYC();
    console.log(`[CRON] Processing briefing for ${briefingDate}`);

    // Duplicate prevention: check if already sent today (skip in test mode)
    if (!process.env.CRON_TEST_EMAIL) {
      const logCheck = await query(
        `SELECT id FROM morning_briefings.email_send_log
         WHERE briefing_date = $1 AND status = 'success' AND triggered_by = 'cron'
         LIMIT 1`,
        [briefingDate],
      );

      if (logCheck.rows.length > 0) {
        console.log(`[CRON] Briefing for ${briefingDate} already sent, skipping`);
        return NextResponse.json({
          skipped: true,
          reason: "already sent",
          briefingDate,
        });
      }
    }

    // Fetch entries for this briefing date
    const entries = await fetchEntriesForBriefingDate(briefingDate);

    if (entries.length === 0) {
      console.log(`[CRON] No entries for ${briefingDate}, skipping`);
      return NextResponse.json({
        skipped: true,
        reason: "no entries",
        briefingDate,
      });
    }

    // Convert image references and external images to data URLs server-side
    for (const entry of entries) {
      if (entry.images && entry.images.length > 0 && entry.entry) {
        entry.entry = await convertImageReferencesServerSide(
          entry.entry,
          entry.images,
          blobStorage,
          "cron/send-briefing",
        );
      }
    }

    // Generate DOCX buffer
    const buffer = await generateDocumentBuffer(entries, briefingDate);
    const fileName = formatExportFilename(briefingDate);

    // Resolve recipients
    const recipients = await resolveRecipients();
    if (recipients.length === 0) {
      console.error("[CRON] No recipients configured");
      await logSend([], "failed", briefingDate, "No recipients configured");
      return NextResponse.json(
        { error: "No recipients configured" },
        { status: 500 },
      );
    }

    // Build and send email
    const formattedDate = formatDateLong(briefingDate);
    const { html, text, subject } = buildBriefingEmailBody(formattedDate);

    const success = await sendEmail(
      recipients.join(", "),
      subject,
      html,
      text,
      {
        attachments: [
          {
            filename: fileName,
            content: buffer,
            contentType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
        ],
      },
    );

    // Log result
    await logSend(
      recipients,
      success ? "success" : "failed",
      briefingDate,
      success ? undefined : "sendEmail returned false",
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    console.log(
      `[CRON] Briefing for ${briefingDate} sent to ${recipients.length} recipients`,
    );

    return NextResponse.json({
      success: true,
      briefingDate,
      recipientCount: recipients.length,
      entryCount: entries.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[CRON] Error:", error);
    // Best-effort log so the failure shows up in email_send_log
    try {
      const briefingDate = getTodayNYC();
      await logSend([], "failed", briefingDate, errorMsg);
    } catch {
      // logSend already has its own try/catch, but guard against getTodayNYC failure too
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
