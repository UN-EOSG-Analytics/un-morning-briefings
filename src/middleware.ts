import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /login (login page)
     * - /api (API routes - they handle their own auth)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /images (public images)
     * - /favicon.ico (favicon file)
     */
    '/((?!login|api|_next/static|_next/image|images|favicon.ico).*)',
  ],
};
