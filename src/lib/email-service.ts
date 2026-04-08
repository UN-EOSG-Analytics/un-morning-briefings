import nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";
import labels from "@/lib/labels.json";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";

/**
 * Resolves the base URL for email links from the incoming request.
 * Reads x-forwarded-proto/host (set by Vercel and most proxies) so the link
 * always matches the actual domain — no env vars required.
 */
export function resolveBaseUrl(req: NextRequest): string {
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (req.url.startsWith("https") ? "https" : "http");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return `${proto}://${host}`;
}

// Create a transporter using the configured SMTP server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/** Load and base64-encode the UN logo for email embedding (cached) */
let cachedLogoDataUri: string | null = null;
function loadLogoDataUri(): string {
  if (cachedLogoDataUri !== null) return cachedLogoDataUri;
  try {
    const logoPath = path.join(
      process.cwd(),
      "public/images/un-logo-stacked-colour-english.svg",
    );
    const logoBuffer = fs.readFileSync(logoPath);
    cachedLogoDataUri = `data:image/svg+xml;base64,${logoBuffer.toString("base64")}`;
    return cachedLogoDataUri;
  } catch (error) {
    console.warn("[EMAIL SERVICE] Warning: Could not read logo file", error);
    cachedLogoDataUri = "";
    return cachedLogoDataUri;
  }
}

/** Shared HTML email wrapper with UN branding */
function buildEmailHtml(contentHtml: string, footerHtml: string = ""): string {
  const logoDataUri = loadLogoDataUri();
  const siteTitle = labels.app.name;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:32px 20px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:520px;">
            <tr>
              <td style="padding:0 0 24px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    ${logoDataUri ? `<td style="vertical-align:middle;padding-right:16px;"><img src="${logoDataUri}" alt="UN" width="180" style="display:block;border:none;max-width:100%;" /></td>` : ""}
                    <td style="vertical-align:middle;">
                      <div style="font-size:20px;font-weight:700;color:#000000;line-height:1.2;">${siteTitle}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr><td style="border-top:1px solid #e5e7eb;padding:24px 0 0;"></td></tr>
            <tr><td>${contentHtml}</td></tr>
            ${footerHtml ? `<tr><td style="padding:24px 0 0;">${footerHtml}</td></tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** CTA button component for emails */
function emailButton(href: string, text: string): string {
  return `<a href="${href}" style="display:inline-block;background:#009edb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:500;border:none;cursor:pointer;">${text}</a>`;
}

/** Fallback link for email */
function emailFallbackLink(href: string): string {
  return `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${href}" style="color:#009edb;word-break:break-all;text-decoration:none;">${href}</a></p>`;
}

/** Send an email with shared error handling and credential check */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  options?: {
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
  },
): Promise<boolean> {
  try {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      console.warn(
        "[EMAIL SERVICE] Warning: SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env",
      );
      return false;
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      text,
      attachments: options?.attachments,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR]", error);
    return false;
  }
}

/** Build an email using the shared UN-branded template */
export { buildEmailHtml };

/**
 * Resolve the briefing email recipient list.
 * Union of user_whitelist + app_settings.email_recipients, deduplicated.
 * If CRON_TEST_EMAIL is set, sends only to that address (for testing).
 * If fallbackEmail is provided and no recipients found, falls back to that address.
 */
export async function resolveRecipients(options?: {
  fallbackEmail?: string;
}): Promise<string[]> {
  const testEmail = process.env.CRON_TEST_EMAIL;
  if (testEmail) {
    return [testEmail];
  }

  const recipientSet = new Set<string>();

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

  if (recipientSet.size === 0 && options?.fallbackEmail) {
    return [options.fallbackEmail];
  }

  return [...recipientSet];
}

/**
 * Build the standard briefing email body (HTML + plain text).
 */
export function buildBriefingEmailBody(formattedDate: string): {
  html: string;
  text: string;
  subject: string;
} {
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

  return {
    html: buildEmailHtml(contentHtml),
    text: `Please find attached the Morning Meeting Update for ${formattedDate}, prepared by the Political Unit, EOSG.\n\nHave a good day!\n\nFor technical assistance, please reach out to the SPMU Data Team.`,
    subject: `Morning Meeting Update - ${formattedDate}`,
  };
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName: string,
  req: NextRequest,
): Promise<boolean> {
  const baseUrl = resolveBaseUrl(req);
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const contentHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Click the button below to verify your email address and complete your registration.<br><br>This link will expire in 24 hours.</p>
    ${emailButton(verificationUrl, "Verify Email")}
    ${emailFallbackLink(verificationUrl)}`;

  const footerHtml = `<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">If you did not request this email, you can safely ignore it.</p>`;

  const html = buildEmailHtml(contentHtml, footerHtml);
  const text = `United Nations | Morning Briefings\n\nClick the link below to verify your email address:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not request this email, you can safely ignore it.`;

  return sendEmail(
    email,
    "Verify your UN Morning Briefing System account",
    html,
    text,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName: string,
  req: NextRequest,
): Promise<boolean> {
  const baseUrl = resolveBaseUrl(req);
  const resetUrl = `${baseUrl}/login?token=${token}`;

  const contentHtml = `
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">A password reset has been requested for this account. Click the button below to set a new password.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;"><strong>This link will expire in 30 minutes.</strong></p>
    ${emailButton(resetUrl, "Reset Password")}
    ${emailFallbackLink(resetUrl)}`;

  const footerHtml = `
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#dc2626;line-height:1.5;"><strong>Security Notice:</strong></p>
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged. For security, this link can only be used once.</p>
    </div>`;

  const html = buildEmailHtml(contentHtml, footerHtml);
  const text = `United Nations | Morning Briefings\n\nHi ${firstName},\n\nA password reset has been requested for this account. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes.\n\nSecurity Notice:\nIf you didn't request a password reset, please ignore this email. Your password will remain unchanged.\nFor security, this link can only be used once.`;

  return sendEmail(
    email,
    "Reset your password - UN Morning Briefing System",
    html,
    text,
  );
}
