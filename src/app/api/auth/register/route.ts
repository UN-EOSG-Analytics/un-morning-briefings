import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, team } = body;

    // Validate all fields
    if (!email || !password || !firstName || !lastName || !team) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email domain
    if (!email.endsWith('@un.org')) {
      return NextResponse.json(
        { error: 'Only @un.org email addresses are allowed' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM pu_morning_briefings.users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // Token valid for 24 hours

    // Insert user
    const result = await query(
      `INSERT INTO pu_morning_briefings.users (email, password_hash, first_name, last_name, team, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email`,
      [email.toLowerCase(), passwordHash, firstName, lastName, team, verificationToken, tokenExpires]
    );

    // Send verification email
    // Use the request origin for production domains, fallback to NEXTAUTH_URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    await sendVerificationEmail(email, verificationToken, firstName, baseUrl);

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
