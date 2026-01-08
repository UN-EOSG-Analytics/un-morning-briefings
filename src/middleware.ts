import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware temporarily disabled - authentication will be added after fixing Edge Runtime compatibility
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};
