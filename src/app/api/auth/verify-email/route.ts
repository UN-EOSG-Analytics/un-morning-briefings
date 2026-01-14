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
    
    console.log('[VERIFY EMAIL] Received token (raw):', plainToken);
    console.log('[VERIFY EMAIL] Received token (decoded):', decodedToken);

    // Try to find user with plain token first
    let result = await query(
      `SELECT id, email, first_name, verification_token_expires 
       FROM pu_morning_briefings.users 
       WHERE verification_token = $1 AND email_verified = FALSE`,
      [plainToken]
    );

    console.log('[VERIFY EMAIL] Token match (plain):', result.rows.length > 0);
    
    // If not found with plain token, try decoded version
    if (result.rows.length === 0 && decodedToken !== plainToken) {
      result = await query(
        `SELECT id, email, first_name, verification_token_expires 
         FROM pu_morning_briefings.users 
         WHERE verification_token = $1 AND email_verified = FALSE`,
        [decodedToken]
      );
      console.log('[VERIFY EMAIL] Token match (decoded):', result.rows.length > 0);
    }

    if (result.rows.length === 0) {
      console.log('[VERIFY EMAIL] Invalid token - no matching user');
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    const user = result.rows[0];

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      console.log('[VERIFY EMAIL] Token expired for user:', user.email);
      return NextResponse.redirect(new URL('/login?error=token_expired', req.url));
    }

    // Mark email as verified
    try {
      const updateResult = await query(
        `UPDATE pu_morning_briefings.users 
         SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL 
         WHERE id = $1
         RETURNING id, email`,
        [user.id]
      );

      console.log('[VERIFY EMAIL] Update result:', updateResult.rows.length, 'rows affected');
      console.log('[VERIFY EMAIL] Email verified successfully for:', user.email);
      
      // Redirect to login with success message
      return NextResponse.redirect(new URL('/login?verified=true', req.url));
    } catch (updateError) {
      console.error('[VERIFY EMAIL] Update failed:', updateError);
      throw updateError;
    }
  } catch (error) {
    console.error('[VERIFY EMAIL] Error:', error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url));
  }
}
