import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

// Create a transporter using the configured SMTP server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName: string,
  baseUrl: string
) {
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  const siteTitle = 'United Nations | Morning Briefings';

  // Read and encode the logo as base64
  let logoDataUri = '';
  try {
    const logoPath = path.join(process.cwd(), 'public/images/UN_Logo_Horizontal_Colour_English.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('[EMAIL SERVICE] Warning: Could not read logo file', error);
    // Fallback: use a simple UN text if logo can't be loaded
    logoDataUri = '';
  }

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Verify your UN Morning Briefing System account',
    html: `
      <!DOCTYPE html>
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
                  <!-- Header matching website -->
                  <tr>
                    <td style="padding:0 0 24px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          ${logoDataUri ? `<td style="vertical-align:middle;padding-right:16px;">
                            <img src="${logoDataUri}" alt="UN" width="180" style="display:block;border:none;max-width:100%;" />
                          </td>` : ''}
                          <td style="vertical-align:middle;">
                            <div style="font-size:20px;font-weight:700;color:#000000;line-height:1.2;">${siteTitle}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Divider -->
                  <tr>
                    <td style="border-top:1px solid #e5e7eb;padding:24px 0 0;"></td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td>
                      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Click the button below to verify your email address and complete your registration.<br><br>This link will expire in 24 hours.</p>
                      <a href="${verificationUrl}" style="display:inline-block;background:#009edb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:500;border:none;cursor:pointer;">Verify Email</a>
                      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${verificationUrl}" style="color:#009edb;word-break:break-all;text-decoration:none;">${verificationUrl}</a></p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:32px 0 0;">
                      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">If you did not request this email, you can safely ignore it.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
      United Nations | Morning Briefings

      Click the link below to verify your email address:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you did not request this email, you can safely ignore it.
    `,
  };

  try {
    // Check if email credentials are configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn(
        '[EMAIL SERVICE] Warning: SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env'
      );
      console.log('[EMAIL PREVIEW]', {
        to: email,
        subject: mailOptions.subject,
        verificationUrl: verificationUrl,
      });
      return true;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL SENT]', { messageId: info.messageId, to: email });
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    // Log the error but don't fail registration
    return false;
  }
}
