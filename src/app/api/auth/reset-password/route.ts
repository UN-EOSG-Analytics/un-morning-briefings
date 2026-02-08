import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    // Validate inputs
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "Invalid reset token" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Find valid reset tokens that haven't been used and haven't expired
    // We need to check all tokens for this email because the token is hashed
    const tokensResult = await query(
      `SELECT pr.id, pr.user_id, pr.token_hash, pr.expires_at, u.email, u.first_name
       FROM pu_morning_briefings.password_resets pr
       JOIN pu_morning_briefings.users u ON pr.user_id = u.id
       WHERE pr.used_at IS NULL 
       AND pr.expires_at > CURRENT_TIMESTAMP`,
      []
    );

    if (tokensResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Find the matching token by comparing hashes
    let matchedToken = null;
    for (const row of tokensResult.rows) {
      const isMatch = await bcrypt.compare(token, row.token_hash);
      if (isMatch) {
        matchedToken = row;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { message: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user's password
    await query(
      "UPDATE pu_morning_briefings.users SET password_hash = $1 WHERE id = $2",
      [passwordHash, matchedToken.user_id]
    );

    // Mark the token as used
    await query(
      "UPDATE pu_morning_briefings.password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = $1",
      [matchedToken.id]
    );

    // Invalidate all other unused tokens for this user (security measure)
    await query(
      "UPDATE pu_morning_briefings.password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL AND id != $2",
      [matchedToken.user_id, matchedToken.id]
    );

    console.log("[PASSWORD RESET] Password successfully reset for user:", matchedToken.email);

    return NextResponse.json(
      {
        message: "Password reset successfully. You can now log in with your new password.",
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

// GET endpoint to validate token without resetting password
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, message: "No token provided" },
        { status: 400 }
      );
    }

    // Find valid reset tokens that haven't been used and haven't expired
    const tokensResult = await query(
      `SELECT pr.id, pr.token_hash, pr.expires_at
       FROM pu_morning_briefings.password_resets pr
       WHERE pr.used_at IS NULL 
       AND pr.expires_at > CURRENT_TIMESTAMP`,
      []
    );

    if (tokensResult.rows.length === 0) {
      return NextResponse.json(
        { valid: false, message: "Invalid or expired token" },
        { status: 200 }
      );
    }

    // Find the matching token by comparing hashes
    let isValid = false;
    for (const row of tokensResult.rows) {
      const isMatch = await bcrypt.compare(token, row.token_hash);
      if (isMatch) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { valid: false, message: "Invalid or expired token" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { valid: true, message: "Token is valid" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PASSWORD RESET TOKEN VALIDATION ERROR]", error);
    return NextResponse.json(
      { valid: false, message: "Error validating token" },
      { status: 500 }
    );
  }
}
