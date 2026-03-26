import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Validate email domain
        if (!credentials.email.endsWith("@un.org")) {
          return null;
        }

        try {
          // Check if email is whitelisted
          const whitelistCheck = await query(
            `SELECT id FROM morning_briefings.user_whitelist WHERE email = $1`,
            [credentials.email.toLowerCase()],
          );

          if (whitelistCheck.rows.length === 0) {
            throw new Error("NOT_AUTHORIZED");
          }

          // Query user from database
          const result = await query(
            `SELECT id, email, password_hash, first_name, last_name, team, role, email_verified
             FROM morning_briefings.users
             WHERE email = $1`,
            [credentials.email.toLowerCase()],
          );

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          // Check if email is verified
          if (!user.email_verified) {
            return null;
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password_hash,
          );

          if (!passwordMatch) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            firstName: user.first_name,
            lastName: user.last_name,
            team: user.team,
            role: user.role,
          };
        } catch (error) {
          if (error instanceof Error && error.message === "NOT_AUTHORIZED") {
            throw error;
          }
          console.error("authorize: Database error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If the user is being redirected back to the login page after sign-in,
      // redirect them to the homepage instead
      if (url === `${baseUrl}/login`) {
        return `${baseUrl}/`;
      }
      // Allow relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Fallback to baseUrl
      return baseUrl;
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        if (session.firstName) token.firstName = session.firstName;
        if (session.lastName) token.lastName = session.lastName;
      }
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.team = user.team;
        token.role = user.role;
        token.whitelisted = true;
      } else if (token.email) {
        // Re-check whitelist on every token refresh
        try {
          const result = await query(
            `SELECT id FROM morning_briefings.user_whitelist WHERE email = $1`,
            [token.email],
          );
          token.whitelisted = result.rows.length > 0;
        } catch {
          // Keep existing value on DB error
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.team = token.team;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (reduced from 30 days for security)
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
