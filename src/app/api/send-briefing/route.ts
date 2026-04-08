import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-helper";
import {
  sendEmail,
  resolveRecipients,
  buildBriefingEmailBody,
} from "@/lib/email-service";
import { formatDateLong } from "@/lib/format-date";
import { query } from "@/lib/db";

async function logSend(
  recipients: string[],
  status: "success" | "failed",
  triggeredBy: string,
  briefingDate: string | null,
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
        briefingDate ?? null,
        triggeredBy,
      ],
    );
  } catch (err) {
    // Never let a logging failure affect the response
    console.error("[SEND-BRIEFING] Failed to write send log:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await checkAuth();
    if (!auth.authenticated || !auth.session?.user?.email) {
      return (
        auth.response ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { docxBlob, fileName, briefingDate, sendToSelf } =
      await request.json();

    if (!docxBlob || !fileName || !briefingDate) {
      return NextResponse.json(
        { error: "Missing docxBlob, fileName, or briefingDate" },
        { status: 400 },
      );
    }

    // Resolve recipients
    let recipients: string[];
    if (sendToSelf) {
      recipients = [auth.session.user.email];
    } else {
      try {
        recipients = await resolveRecipients({
          fallbackEmail: auth.session.user.email,
        });
      } catch (err) {
        console.error("[SEND-BRIEFING] Failed to load recipients:", err);
        recipients = [auth.session.user.email];
      }
    }

    // Convert base64 blob to Buffer
    const base64Data = docxBlob.split(",")[1] || docxBlob;
    const buffer = Buffer.from(base64Data, "base64");

    const formattedDate = formatDateLong(briefingDate);
    const { html, text, subject } = buildBriefingEmailBody(formattedDate);

    const success = await sendEmail(recipients.join(", "), subject, html, text, {
      attachments: [
        {
          filename: fileName,
          content: buffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ],
    });

    await logSend(
      recipients,
      success ? "success" : "failed",
      auth.session.user.email,
      briefingDate ?? null,
      success ? undefined : "sendEmail returned false",
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("[SEND-BRIEFING] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
