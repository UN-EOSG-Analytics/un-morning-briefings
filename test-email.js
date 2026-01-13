#!/usr/bin/env node
require('dotenv').config();
const nodemailer = require('nodemailer');

// Log all SMTP configuration
console.log('📧 SMTP Configuration:');
console.log('  Host:', process.env.SMTP_HOST);
console.log('  Port:', process.env.SMTP_PORT);
console.log('  User:', process.env.SMTP_USER);
console.log('  From:', process.env.SMTP_FROM);
console.log('  Pass:', process.env.SMTP_PASS ? '***SET***' : '***NOT SET***');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test connection
console.log('\n⏳ Testing SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('✗ SMTP connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('✓ SMTP connection successful!\n');

    // Send test email
    const testEmail = {
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: 'Test - UN Morning Briefing System Email',
      html: `
        <h1>Email Test</h1>
        <p>This is a test email from the UN Morning Briefing System.</p>
        <p>If you receive this, the email service is working correctly!</p>
      `,
      text: 'Test email - if you receive this, the email service is working.',
    };

    console.log('⏳ Sending test email to:', testEmail.to);
    transporter.sendMail(testEmail, (error, info) => {
      if (error) {
        console.error('✗ Email failed to send:', error.message);
        process.exit(1);
      } else {
        console.log('✓ Test email sent successfully!');
        console.log('  Message ID:', info.messageId);
        console.log('  Response:', info.response);
        process.exit(0);
      }
    });
  }
});
