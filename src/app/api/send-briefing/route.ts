import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Format a date string (YYYY-MM-DD) to long format without timezone conversion
 */
function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Create date object without timezone issues (use UTC components)
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = dayNames[date.getUTCDay()];
  
  return `${dayOfWeek}, ${monthNames[month - 1]} ${day}, ${year}`;
}

// Create a transporter using the configured SMTP server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { docxBlob, fileName, briefingDate } = await request.json();

    if (!docxBlob || !fileName) {
      return NextResponse.json(
        { error: 'Missing docxBlob or fileName' },
        { status: 400 }
      );
    }

    // Convert base64 blob to Buffer
    const base64Data = docxBlob.split(',')[1] || docxBlob;
    const buffer = Buffer.from(base64Data, 'base64');

    // Read and encode the logo as base64
    let logoDataUri = '';
    try {
      const logoPath = path.join(process.cwd(), 'public/images/UN_Logo_Stacked_Colour_English.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      console.warn('[EMAIL SERVICE] Warning: Could not read logo file', error);
    }

    const siteTitle = 'United Nations | Morning Briefings';
    const formattedDate = formatDateLong(briefingDate);

    // Send email with attachment
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: session.user.email,
      subject: `Morning Briefing - ${formattedDate}`,
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
                        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                          Please find the daily morning briefing for <strong>${formattedDate}</strong> attached to this email.
                        </p>
                        <p style="margin:16px 0;font-size:15px;line-height:1.6;color:#374151;">
                          The document contains all approved entries organized by priority with full content and formatting.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:32px 0 0;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                          This email was sent from the United Nations Morning Briefing System.
                        </p>
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

        Please find the daily morning briefing for ${formattedDate} attached to this email.

        The document contains all approved entries organized by priority with full content and formatting.
      `,
      attachments: [
        {
          filename: fileName,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('[SEND-BRIEFING] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
