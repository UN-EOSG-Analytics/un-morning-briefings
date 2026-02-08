import nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";
import labels from "@/lib/labels.json";

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

/** Load and base64-encode the UN logo for email embedding */
function loadLogoDataUri(): string {
  try {
    const logoPath = path.join(
      process.cwd(),
      "public/images/UN_Logo_Stacked_Colour_English.png",
    );
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("[EMAIL SERVICE] Warning: Could not read logo file", error);
    return "";
  }
}

/** Shared HTML email wrapper with UN branding */
function buildEmailHtml(
  contentHtml: string,
  footerHtml: string = "",
): string {
  const logoDataUri = loadLogoDataUri();
  const siteTitle = labels.settings.email.siteTitle;

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
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  previewExtra?: Record<string, string>,
): Promise<boolean> {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("[EMAIL SERVICE] Warning: SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env");
      console.log("[EMAIL PREVIEW]", { to, subject, ...previewExtra });
      return true;
    }
    const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html, text });
    console.log("[EMAIL SENT]", { messageId: info.messageId, to });
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR]", error);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName: string,
  baseUrl: string,
): Promise<boolean> {
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const contentHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Click the button below to verify your email address and complete your registration.<br><br>This link will expire in 24 hours.</p>
    ${emailButton(verificationUrl, "Verify Email")}
    ${emailFallbackLink(verificationUrl)}`;

  const footerHtml = `<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">If you did not request this email, you can safely ignore it.</p>`;

  const html = buildEmailHtml(contentHtml, footerHtml);
  const text = `United Nations | Morning Briefings\n\nClick the link below to verify your email address:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not request this email, you can safely ignore it.`;

  return sendEmail(email, "Verify your UN Morning Briefing System account", html, text, { verificationUrl });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName: string,
  baseUrl: string,
): Promise<boolean> {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const contentHtml = `
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#374151;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">We received a request to reset your password. Click the button below to create a new password.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;"><strong>This link will expire in 30 minutes.</strong></p>
    ${emailButton(resetUrl, "Reset Password")}
    ${emailFallbackLink(resetUrl)}`;

  const footerHtml = `
    <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#dc2626;line-height:1.5;"><strong>Security Notice:</strong></p>
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged. For security, this link can only be used once.</p>
    </div>`;

  const html = buildEmailHtml(contentHtml, footerHtml);
  const text = `United Nations | Morning Briefings\n\nHi ${firstName},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes.\n\nSecurity Notice:\nIf you didn't request a password reset, please ignore this email. Your password will remain unchanged.\nFor security, this link can only be used once.`;

  return sendEmail(email, "Reset your password - UN Morning Briefing System", html, text, { resetUrl });
}
