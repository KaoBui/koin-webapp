import NextAuth from "next-auth";

import { authConfig, isAllowedEmail } from "@/auth.config";

// Edge-safe Auth.js instance (no Prisma adapter on the edge).
const { auth } = NextAuth(authConfig);

// Paths reachable without an authenticated session.
const PUBLIC_PATHS = ["/login", "/terms", "/privacy"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const isAllowed = isLoggedIn && isAllowedEmail(req.auth?.user?.email);
  const isPublic = PUBLIC_PATHS.some(
    (path) =>
      nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/"),
  );

  if (isPublic) {
    // Already authenticated + whitelisted users shouldn't sit on /login,
    // but should still be able to read /terms and /privacy.
    if (isLoggedIn && isAllowed && nextUrl.pathname === "/login") {
      return Response.redirect(new URL("/", nextUrl));
    }
    return; // allow access to the public page
  }

  // Every other route requires an authenticated, whitelisted session.
  if (!isLoggedIn || !isAllowed) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  // Authenticated + whitelisted: continue.
});

export const config = {
  // Run on all routes except Next internals, the Auth.js API, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
