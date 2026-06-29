import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Comma-separated whitelist of allowed Google account emails, normalised to
// lowercase. This is the single source of truth for access control and is read
// by both the Auth.js sign-in callback and the middleware.
export const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  return allowedEmails.includes(email.toLowerCase());
}

// Edge-safe Auth.js config: NO Prisma adapter or Node-only imports here, so it
// can be used by the middleware (which runs on the edge runtime). The full
// config in `auth.ts` spreads this and adds the Prisma adapter.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment.
  providers: [Google],
  callbacks: {
    // Block sign-in at the source for anyone not on the whitelist.
    signIn({ user }) {
      return isAllowedEmail(user.email);
    },
    // Persist the user id onto the JWT so it is available on the edge / in the
    // session without a database round-trip.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
