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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5; }
            .header { background-color: #003399; color: white; padding: 40px 20px; text-align: center; border-bottom: 4px solid #0055cc; }
            .logo { max-width: 120px; height: auto; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 40px 20px; background-color: white; }
            .welcome { font-size: 16px; color: #003399; font-weight: 600; margin-bottom: 20px; }
            .message { font-size: 15px; color: #333; line-height: 1.8; margin-bottom: 30px; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 14px 40px; background-color: #003399; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
            .button:hover { background-color: #0055cc; }
            .link-section { background-color: #f9f9f9; padding: 20px; border-left: 4px solid #003399; margin: 20px 0; border-radius: 4px; }
            .link-label { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 8px; }
            .link-text { font-size: 13px; color: #003399; word-break: break-all; font-family: monospace; }
            .expiry { font-size: 13px; color: #ff6b6b; margin: 20px 0; font-weight: 600; }
            .footer { background-color: #f5f5f5; padding: 30px 20px; text-align: center; border-top: 1px solid #ddd; }
            .footer p { margin: 5px 0; font-size: 12px; color: #666; }
            .footer-accent { color: #003399; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://www.un.org/img/logo.png" alt="United Nations Logo" class="logo" />
              <h1>UN Morning Briefing System</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <p class="welcome">Hello ${firstName},</p>
              <p class="message">
                Thank you for registering with the <strong>UN Morning Briefing System</strong>. 
                To complete your registration, please verify your email address by clicking the button below:
              </p>
              <div class="button-container">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p style="text-align: center; color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <div class="link-section">
                <div class="link-label">Verification Link:</div>
                <div class="link-text">${verificationUrl}</div>
              </div>
              <p class="expiry">⏱ This link will expire in 24 hours.</p>
              <p style="color: #666; font-size: 13px; line-height: 1.6;">
                If you did not create this account or did not request this email, please ignore it. 
                Your account will not be activated until you verify your email address.
              </p>
            </div>
            <div class="footer">
              <p><span class="footer-accent">UN Morning Briefing System</span></p>
              <p>&copy; 2026 United Nations. All rights reserved.</p>
              <p style="margin-top: 10px; font-size: 11px;">Political Unit (EOSG)</p>
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
