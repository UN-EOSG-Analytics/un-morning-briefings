import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      console.log('[VERIFY EMAIL] No token provided');
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    // The token should be plain hex, but try both versions to handle encoding variations
    const plainToken = token;
    const decodedToken = decodeURIComponent(token);

    // Try to find user with plain token first (regardless of verification status)
    let result = await query(
      `SELECT id, email, first_name, verification_token_expires, email_verified
       FROM pu_morning_briefings.users 
       WHERE verification_token = $1`,
      [plainToken]
    );

    // If not found with plain token, try decoded version
    if (result.rows.length === 0 && decodedToken !== plainToken) {
      result = await query(
        `SELECT id, email, first_name, verification_token_expires, email_verified
         FROM pu_morning_briefings.users 
         WHERE verification_token = $1`,
        [decodedToken]
      );
    }

    if (result.rows.length === 0) {
      console.log('[VERIFY EMAIL] Invalid token - no matching user');
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    const user = result.rows[0];

    // If already verified, that's fine - just redirect to success
    if (user.email_verified) {
      console.log('[VERIFY EMAIL] Email already verified for:', user.email);
      return NextResponse.redirect(new URL('/login?verified=true', req.url));
    }

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      console.log('[VERIFY EMAIL] Token expired for user:', user.email);
      return NextResponse.redirect(new URL('/login?error=token_expired', req.url));
    }

    // Mark email as verified
    await query(
      `UPDATE pu_morning_briefings.users 
       SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL 
       WHERE id = $1`,
      [user.id]
    );

    console.log('[VERIFY EMAIL] Email verified successfully for:', user.email);
    return NextResponse.redirect(new URL('/login?verified=true', req.url));
  } catch (error) {
    console.error('[VERIFY EMAIL] Error:', error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url));
  }
}
