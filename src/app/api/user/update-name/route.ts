import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { firstName, lastName } = body;

    // Validate fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Update user in database
    const result = await query(
      `UPDATE pu_morning_briefings.users 
       SET first_name = $1, last_name = $2 
       WHERE email = $3 
       RETURNING id, email, first_name, last_name`,
      [firstName.trim(), lastName.trim(), session.user.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
      },
    });
  } catch (error) {
    console.error('[UPDATE NAME ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update name' },
      { status: 500 }
    );
  }
}
