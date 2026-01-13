import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find user with this token
    const result = await query(
      `SELECT id, email, first_name, verification_token_expires 
       FROM pu_morning_briefings.users 
       WHERE verification_token = $1 AND email_verified = FALSE`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return NextResponse.redirect(new URL('/login?error=token_expired', req.url));
    }

    // Mark email as verified
    await query(
      `UPDATE pu_morning_briefings.users 
       SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL 
       WHERE id = $1`,
      [user.id]
    );

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true', req.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url));
  }
}
