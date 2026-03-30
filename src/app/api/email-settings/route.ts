import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkAuth } from "@/lib/auth-helper";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/email-settings
 * Returns the global scheduled-email configuration.
 * { emailTime: "HH:MM" (America/New_York), emailRecipients: string[] }
 */
export async function GET() {
  const auth = await checkAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const result = await query<{ key: string; value: string }>(
      `SELECT key, value
       FROM morning_briefings.app_settings
       WHERE key IN ('email_time', 'email_recipients')`,
    );

    const map = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));

    let emailRecipients: string[] = [];
    if (map.email_recipients) {
      try {
        emailRecipients = JSON.parse(map.email_recipients);
        if (!Array.isArray(emailRecipients)) emailRecipients = [];
      } catch {
        emailRecipients = [];
      }
    }

    return NextResponse.json({
      emailTime: map.email_time ?? "",
      emailRecipients,
    });
  } catch (error) {
    console.error("[EMAIL-SETTINGS GET]", error);
    return NextResponse.json(
      { error: "Failed to load email settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/email-settings
 * Saves the global scheduled-email configuration.
 * Body: { emailTime: "HH:MM", emailRecipients: string[] }
 */
export async function POST(request: NextRequest) {
  const auth = await checkAuth();
  if (!auth.authenticated) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { emailTime, emailRecipients } = body as {
    emailTime?: unknown;
    emailRecipients?: unknown;
  };

  if (typeof emailTime !== "string" || !/^\d{2}:\d{2}$/.test(emailTime)) {
    return NextResponse.json(
      { error: "emailTime must be in HH:MM format" },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(emailRecipients) ||
    emailRecipients.some((e) => typeof e !== "string" || !EMAIL_REGEX.test(e))
  ) {
    return NextResponse.json(
      { error: "emailRecipients must be an array of valid email addresses" },
      { status: 400 },
    );
  }

  try {
    await query(
      `INSERT INTO morning_briefings.app_settings (key, value, updated_at)
       VALUES ('email_time', $1, NOW()),
              ('email_recipients', $2, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = NOW()`,
      [emailTime, JSON.stringify(emailRecipients)],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EMAIL-SETTINGS POST]", error);
    return NextResponse.json(
      { error: "Failed to save email settings" },
      { status: 500 },
    );
  }
}
