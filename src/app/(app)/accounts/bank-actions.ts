"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { startAuth } from "@/lib/enablebanking";
import { BANK_STATE_COOKIE, bankCallbackUrl, consentValidUntil } from "@/lib/banking";
import { syncUser } from "@/lib/bank-sync";

/**
 * Begin linking a bank. Calls Enable Banking to start authorization and returns
 * the bank's consent URL for the client to redirect to. A random `state` is
 * stashed in an httpOnly cookie and echoed by the bank so the callback can
 * verify the round-trip belongs to this browser/session.
 */
export const connectBank = action(
  async (
    _userId,
    input: { aspspName: string; aspspCountry: string },
  ): Promise<ActionResult<{ url: string }>> => {
    const aspspName = input.aspspName?.trim();
    const aspspCountry = input.aspspCountry?.trim().toUpperCase();
    if (!aspspName || !aspspCountry) {
      return { ok: false, error: "Pick a bank to connect." };
    }

    const state = randomUUID();
    cookies().set(BANK_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15, // 15 minutes to complete the bank flow
    });

    const { url } = await startAuth({
      aspsp: { name: aspspName, country: aspspCountry },
      redirectUrl: bankCallbackUrl(),
      state,
      validUntil: consentValidUntil(),
    });

    return { ok: true, data: { url } };
  },
);

/**
 * Pull the latest transactions from all of the user's linked banks into their
 * ledger. Idempotent (dedups on the bank's transaction id), so it's safe to run
 * on demand as often as the user likes.
 */
export const syncBank = action(
  async (userId): Promise<ActionResult<{ inserted: number; errors: string[] }>> => {
    const { inserted, errors } = await syncUser(userId);
    revalidateFinance();
    return { ok: true, data: { inserted, errors } };
  },
);
