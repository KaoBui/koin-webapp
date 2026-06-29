import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { ensureDefaultCategories } from "@/lib/categories";

// Full Auth.js instance (Node runtime). Uses the Prisma adapter to persist
// users/accounts, with a JWT session strategy so the middleware can read the
// session on the edge.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  events: {
    // Seed default categories the first time a user record is created. Wrapped
    // so a seeding hiccup can never block sign-in (the categories page also
    // ensures defaults as a safety net).
    async createUser({ user }) {
      if (!user.id) return;
      try {
        await ensureDefaultCategories(user.id);
      } catch (error) {
        console.error("Failed to seed default categories:", error);
      }
    },
  },
});
