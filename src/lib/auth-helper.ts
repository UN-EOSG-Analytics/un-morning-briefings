import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

/**
 * Check if the user is authenticated
 * Returns the session if authenticated, or an error response if not
 */
export async function checkAuth() {
  try {
    console.log('checkAuth: Starting authentication check');
    const session = await getServerSession(authOptions);
    
    console.log('checkAuth: Got session:', !!session);
    if (!session) {
      console.log('checkAuth: No session found, returning 401');
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Unauthorized', details: 'You must be logged in to access this resource' },
          { status: 401 }
        ),
      };
    }

    console.log('checkAuth: Session valid, user:', session.user?.email);
    return {
      authenticated: true,
      session,
    };
  } catch (error) {
    console.error('checkAuth: Authentication error:', error);
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Authentication error', details: error instanceof Error ? error.message : 'Failed to verify session' },
        { status: 500 }
      ),
    };
  }
}
