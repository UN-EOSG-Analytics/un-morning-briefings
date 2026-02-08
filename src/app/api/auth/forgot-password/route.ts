import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email-service";

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    // New window - allow request
    rateLimitMap.set(identifier, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }
  
  if (record.count >= 3) {
    // Too many requests
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email format
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Rate limiting by email (3 requests per 15 minutes)
    if (!checkRateLimit(email.toLowerCase())) {
      return NextResponse.json(
        {
          message:
            "Too many password reset requests. Please try again in 15 minutes.",
        },
        { status: 429 }
      );
    }

    // Rate limiting by IP (10 requests per 15 minutes)
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(`ip:${ip}`)) {
      return NextResponse.json(
        {
          message:
            "Too many requests from this IP. Please try again in 15 minutes.",
        },
        { status: 429 }
      );
    }

    // Look up user - but don't reveal if they exist (security best practice)
    const userResult = await query(
      "SELECT id, email, first_name FROM pu_morning_briefings.users WHERE LOWER(email) = LOWER($1) AND email_verified = TRUE",
      [email]
    );

    // Always return success to prevent email enumeration
    // This prevents attackers from discovering valid email addresses
    if (userResult.rows.length === 0) {
      console.log("[PASSWORD RESET] Request for non-existent or unverified user:", email);
      return NextResponse.json(
        {
          message:
            "If an account with that email exists, a password reset link has been sent.",
        },
        { status: 200 }
      );
    }

    const user = userResult.rows[0];

    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Hash the token before storing (using bcrypt with 12 rounds)
    const tokenHash = await bcrypt.hash(resetToken, 12);
    
    // Set expiration to 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    // Get IP address for audit trail
    const ipAddress = ip.substring(0, 45); // Limit to IPv6 length

    // Invalidate any existing reset tokens for this user
    await query(
      "UPDATE pu_morning_briefings.password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL",
      [user.id]
    );

    // Store the hashed token in database
    await query(
      `INSERT INTO pu_morning_briefings.password_resets 
       (user_id, token_hash, expires_at, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, tokenHash, expiresAt, ipAddress]
    );

    // Get base URL for email link
    const baseUrl = process.env.NEXTAUTH_URL || "https://briefings.eosg.dev";
    
    // Send email with reset link containing the plain token
    const emailSent = await sendPasswordResetEmail(
      user.email,
      resetToken,
      user.first_name,
      baseUrl
    );

    if (!emailSent) {
      console.error("[PASSWORD RESET] Failed to send email to:", user.email);
      // Don't reveal email send failure to user for security
    }

    console.log("[PASSWORD RESET] Reset email sent to:", user.email);

    // Always return generic success message
    return NextResponse.json(
      {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PASSWORD RESET ERROR]", error);
    return NextResponse.json(
      { message: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
