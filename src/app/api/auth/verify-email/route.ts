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

    // Try to find user with this token (regardless of verification status)
    const plainToken = token;
    const decodedToken = decodeURIComponent(token);
    
    // First try plain token
    let result = await query(
      `SELECT id, email, first_name, email_verified, verification_token, verification_token_expires 
       FROM pu_morning_briefings.users 
       WHERE verification_token = $1`,
      [plainToken]
    );
    
    // If not found, try decoded version
    if (result.rows.length === 0 && decodedToken !== plainToken) {
      result = await query(
        `SELECT id, email, first_name, email_verified, verification_token, verification_token_expires 
         FROM pu_morning_briefings.users 
         WHERE verification_token = $1`,
        [decodedToken]
      );
    }

    // If still no match, token is invalid or already used
    if (result.rows.length === 0) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.redirect(new URL('/login?verified=true', req.url));
    }

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return NextResponse.redirect(new URL('/login?error=token_expired', req.url));
    }

    // Now mark email as verified and clear the token
    await query(
      `UPDATE pu_morning_briefings.users 
       SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL 
       WHERE id = $1`,
      [user.id]
    );

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true', req.url));
  } catch (error) {
    console.error('[VERIFY EMAIL] Error:', error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url));
  }
}
