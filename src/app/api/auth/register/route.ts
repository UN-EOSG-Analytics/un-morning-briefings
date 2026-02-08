import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, team } = body;

    // Validate all fields
    if (!email || !password || !firstName || !lastName || !team) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validate email domain
    if (!email.endsWith("@un.org")) {
      return NextResponse.json(
        { error: "Only @un.org email addresses are allowed" },
        { status: 400 },
      );
    }

    // Check if email is whitelisted
    const whitelistCheck = await query(
      "SELECT id FROM pu_morning_briefings.user_whitelist WHERE email = $1",
      [email.toLowerCase()],
    );

    if (whitelistCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "This email address is not authorized to register. Please contact an administrator." },
        { status: 403 },
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM pu_morning_briefings.users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // Token valid for 24 hours

    // Insert user
    const result = await query(
      `INSERT INTO pu_morning_briefings.users (email, password_hash, first_name, last_name, team, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email`,
      [
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        team,
        verificationToken,
        tokenExpires,
      ],
    );

    // Update whitelist entry to link the user
    await query(
      `UPDATE pu_morning_briefings.user_whitelist 
       SET user_id = $1 
       WHERE email = $2`,
      [result.rows[0].id, email.toLowerCase()],
    );

    // Send verification email
    // Use NEXTAUTH_URL for consistent, trusted base URL (never trust Host header)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await sendVerificationEmail(email, verificationToken, firstName, baseUrl);

    return NextResponse.json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 },
    );
  }
}
