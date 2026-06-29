import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";

/**
 * Standard result shape returned by every Server Action. The client narrows on
 * `ok`: on failure it reads `error` (and optionally `field` to highlight the
 * offending input); on success it reads `data` when the action returns a value.
 */
export type ActionResult<T = void> =
  | ([T] extends [void] ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; field?: string };

/**
 * Wrap a Server Action so that it:
 *  1. enforces authentication and injects the signed-in `userId` (making it
 *     structurally impossible to add an action that forgets the auth check), and
 *  2. converts any thrown error into a clean `ActionResult` so a DB/runtime
 *     failure never escapes as a raw Server Component render error.
 *
 * The wrapped action keeps its natural external signature — the leading
 * `userId` is supplied by the wrapper, not the caller.
 */
export function action<
  Args extends unknown[],
  R extends { ok: true } | { ok: false; error: string },
>(fn: (userId: string, ...args: Args) => Promise<R>) {
  return async (...args: Args): Promise<R | { ok: false; error: string }> => {
    try {
      const session = await auth();
      if (!session?.user?.id) return { ok: false, error: "Not authenticated." };
      return await fn(session.user.id, ...args);
    } catch (err) {
      // Unique-constraint violation — surface a friendly message instead of a
      // 500. Covers races that slip past pre-checks (e.g. duplicate category).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { ok: false, error: "That already exists." };
      }
      console.error("Server action failed:", err);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  };
}

/**
 * Revalidate everything under the shared `(app)` layout. Finance data is
 * cross-cutting — the dashboard, transactions and categories pages all read the
 * same tables — so a mutation in one feature must refresh the others.
 */
export function revalidateFinance() {
  revalidatePath("/", "layout");
}
