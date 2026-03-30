import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

export interface EmailSendLogEntry {
  id: number;
  sentAt: string;
  recipients: string[];
  status: "success" | "failed";
  errorMsg: string | null;
  briefingDate: string | null;
  triggeredBy: string;
}

/**
 * GET /api/email-send-log
 * Returns the last 20 briefing email send attempts, newest first.
 */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const result = await query<{
      id: number;
      sent_at: string;
      recipients: string;
      status: string;
      error_msg: string | null;
      briefing_date: string | null;
      triggered_by: string;
    }>(
      `SELECT id, sent_at, recipients, status, error_msg, briefing_date, triggered_by
       FROM morning_briefings.email_send_log
       ORDER BY sent_at DESC
       LIMIT 20`,
    );

    const rows: EmailSendLogEntry[] = result.rows.map((r) => {
      let recipients: string[] = [];
      try {
        recipients = JSON.parse(r.recipients);
        if (!Array.isArray(recipients)) recipients = [r.recipients];
      } catch {
        recipients = [r.recipients];
      }
      return {
        id: r.id,
        sentAt: r.sent_at,
        recipients,
        status: r.status as "success" | "failed",
        errorMsg: r.error_msg,
        briefingDate: r.briefing_date,
        triggeredBy: r.triggered_by,
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[EMAIL-SEND-LOG GET]", error);
    return NextResponse.json(
      { error: "Failed to load send log" },
      { status: 500 },
    );
  }
}
