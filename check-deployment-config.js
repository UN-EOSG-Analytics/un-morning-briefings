#!/usr/bin/env node
require('dotenv').config();

console.log('🔍 CHECKING DEPLOYMENT CONFIGURATION\n');
console.log('='.repeat(70));

// Check environment variables
console.log('\n📋 ENVIRONMENT VARIABLES:');
console.log('-'.repeat(70));

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_FROM',
  'SMTP_PASS',
  'NODE_ENV'
];

requiredEnvVars.forEach(key => {
  const value = process.env[key];
  const status = value ? '✓' : '✗';
  const display = value ? (key.includes('PASS') || key.includes('SECRET') ? '***SET***' : value.substring(0, 50)) : 'NOT SET';
  console.log(`  ${status} ${key.padEnd(20)} : ${display}`);
});

// Production-specific checks
console.log('\n🚀 PRODUCTION DEPLOYMENT CHECKS:');
console.log('-'.repeat(70));

const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`  Node Environment: ${nodeEnv}`);

if (nodeEnv === 'production') {
  console.log(`  ✓ Running in production mode`);
} else {
  console.log(`  ⚠️  NOT in production mode (${nodeEnv})`);
}

// Check for common issues
console.log('\n⚠️  POSSIBLE ISSUES TO CHECK:');
console.log('-'.repeat(70));

const issues = [
  {
    title: 'Vercel Project Settings',
    items: [
      '1. Go to https://vercel.com/un-eosg-analytics/un-morning-briefings',
      '2. Check Settings → Environment Variables',
      '3. Verify all SMTP_* and DATABASE_URL are set correctly',
      '4. Check for any typos in variable names'
    ]
  },
  {
    title: 'Email Link Generation',
    items: [
      '1. The register endpoint uses req.headers.get("host")',
      '2. In production, this might not include the protocol',
      '3. Check if emails are being sent with correct domain',
      '4. Look at Vercel Function logs for email URLs'
    ]
  },
  {
    title: 'Common Failure Scenarios',
    items: [
      '1. Token expires too quickly (timing issues)',
      '2. Token contains special characters that get encoded differently',
      '3. Email service fails silently (check SMTP credentials)',
      '4. URL in email has wrong domain name',
      '5. Query parameter is not being extracted correctly',
      '6. Database connection times out on token lookup'
    ]
  },
  {
    title: 'Debugging Steps',
    items: [
      '1. Check Vercel Function logs: Deployments → Select deployment → Function logs',
      '2. Look for [VERIFY EMAIL] log messages',
      '3. Register a test account and note the exact verification URL in the email',
      '4. Try accessing that URL manually to see the error',
      '5. Check if the token was actually inserted in the database',
      '6. Verify database connection string matches between local and production'
    ]
  }
];

issues.forEach(issue => {
  console.log(`\n${issue.title}:`);
  issue.items.forEach(item => {
    console.log(`  • ${item}`);
  });
});

console.log('\n' + '='.repeat(70));
console.log('\n🔗 VERIFICATION URL PATTERNS:');
console.log('-'.repeat(70));

const testToken = '30fc3d906641c87c549a4d525fae74d2e220495168ca733e3a3cfdd71d1762db';
const URLs = [
  `http://localhost:3000/api/auth/verify-email?token=${testToken}`,
  `https://un-morning-briefings.vercel.app/api/auth/verify-email?token=${testToken}`,
];

URLs.forEach((url, idx) => {
  console.log(`\n${idx + 1}. ${url}`);
  console.log(`   Length: ${url.length} characters`);
});

console.log('\n' + '='.repeat(70));
console.log('\n✅ NEXT STEPS:');
console.log('-'.repeat(70));
console.log(`
1. 🔐 Verify Vercel Environment Variables:
   - Ensure DATABASE_URL, SMTP_*, NEXTAUTH_* are all set in Vercel project
   
2. 📧 Check Recent Emails:
   - Register again with a test email
   - Check the exact URL in the received email
   - Note if the domain is correct
   
3. 📋 Review Logs:
   - Check Vercel Function logs for [VERIFY EMAIL] messages
   - Look for any error messages
   
4. 🧪 Manual Test:
   - If you have a token from a registration, manually insert it into the database
   - Test if you can verify it manually
   
5. 💬 Report:
   - Share the [VERIFY EMAIL] log messages from Vercel
   - Include the exact URL from the email
   - Include any error messages
`);

console.log('='.repeat(70) + '\n');
