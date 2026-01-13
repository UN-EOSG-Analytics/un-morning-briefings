import nodemailer from 'nodemailer';

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

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Verify your UN Morning Briefing System account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #003399; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background-color: #003399; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UN Morning Briefing System</h1>
            </div>
            <div class="content">
              <p>Hello ${firstName},</p>
              <p>Thank you for registering with the UN Morning Briefing System. Please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>Or copy and paste this link in your browser:</p>
              <p><code>${verificationUrl}</code></p>
              <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
              <div class="footer">
                <p>If you did not create this account, please ignore this email.</p>
                <p>&copy; United Nations. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${firstName},

      Thank you for registering with the UN Morning Briefing System. 
      Please verify your email address by visiting the link below:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you did not create this account, please ignore this email.

      United Nations
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
