import type { DefaultSession } from "next-auth";

// Expose `id` on the session user so app code can scope queries per user.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
