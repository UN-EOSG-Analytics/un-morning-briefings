import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth-helper";
import { sendEmail, buildEmailHtml } from "@/lib/email-service";
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

    if (!docxBlob || !fileName) {
      return NextResponse.json(
        { error: "Missing docxBlob or fileName" },
        { status: 400 },
      );
    }

    // When sendToSelf is true, skip the distribution list entirely.
    let recipients: string[];

    if (sendToSelf) {
      recipients = [auth.session.user.email];
    } else {
      // Build recipient list: all whitelisted emails + any additional recipients
      // from app_settings, deduplicated. Falls back to the current user only if
      // both sources are empty.
      const recipientSet = new Set<string>();

      try {
        const [whitelistResult, settingsResult] = await Promise.all([
          query<{ email: string }>(
            `SELECT email FROM morning_briefings.user_whitelist ORDER BY email`,
          ),
          query<{ value: string }>(
            `SELECT value FROM morning_briefings.app_settings WHERE key = 'email_recipients'`,
          ),
        ]);

        for (const row of whitelistResult.rows) {
          recipientSet.add(row.email.toLowerCase());
        }

        if (settingsResult.rows.length > 0) {
          try {
            const extra = JSON.parse(settingsResult.rows[0].value);
            if (Array.isArray(extra)) {
              for (const e of extra) {
                if (typeof e === "string" && e.trim()) {
                  recipientSet.add(e.toLowerCase().trim());
                }
              }
            }
          } catch {
            // malformed JSON — ignore
          }
        }
      } catch (err) {
        console.error("[SEND-BRIEFING] Failed to load recipients:", err);
      }

      recipients =
        recipientSet.size > 0 ? [...recipientSet] : [auth.session.user.email];
    }

    // Convert base64 blob to Buffer
    const base64Data = docxBlob.split(",")[1] || docxBlob;
    const buffer = Buffer.from(base64Data, "base64");

    const formattedDate = formatDateLong(briefingDate);

    const contentHtml = `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Please find attached the Morning Meeting Update for <strong>${formattedDate}</strong>, prepared by the Political Unit, EOSG.
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
        Have a good day!
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
        For technical assistance, please reach out to the SPMU Data Team.
      </p>`;

    const html = buildEmailHtml(contentHtml);

    // plain-text fallback
    const text = `Please find attached the Morning Meeting Update for ${formattedDate}, prepared by the Political Unit, EOSG.\n\nHave a good day!\n\nFor technical assistance, please reach out to the SPMU Data Team.`;

    const success = await sendEmail(
      recipients.join(", "),
      `Morning Meeting Update - ${formattedDate}`,
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
