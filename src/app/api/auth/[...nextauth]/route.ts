import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('authorize: Called with credentials');
        if (!credentials?.password) {
          console.log('authorize: No password provided');
          return null;
        }

        const sitePassword = process.env.SITE_PASSWORD;
        if (!sitePassword) {
          console.error('authorize: SITE_PASSWORD not configured');
          throw new Error('SITE_PASSWORD not configured');
        }

        if (credentials.password === sitePassword) {
          console.log('authorize: Password correct, returning user');
          return {
            id: 'un-user',
            name: 'UN Political Unit',
            email: 'political-unit@un.org',
          };
        }

        console.log('authorize: Password incorrect');
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('jwt callback: Called', { hasUser: !!user, hasAccount: !!account });
      if (user) {
        console.log('jwt callback: Adding user to token');
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('session callback: Called', { hasToken: !!token, tokenId: token.id });
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
