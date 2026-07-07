import { headers } from "next/headers";

import type { EbAccount } from "@/lib/enablebanking";
import type { AccountTypeValue } from "@/lib/account-constants";

/** Cookie holding the CSRF `state` we expect the bank to echo back on callback. */
export const BANK_STATE_COOKIE = "eb_auth_state";

// How long to request bank consent for. Banks cap this (often 90–180 days);
// after it expires the user must re-authorize.
export const CONSENT_DAYS = 90;

export function consentValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + CONSENT_DAYS);
  return d.toISOString();
}

/** Origin of the current request (works in dev and behind a proxy in prod). */
export function getOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** The redirect URL the bank sends the user back to — must be registered in the
 * Enable Banking Control Panel. */
export function bankCallbackUrl(): string {
  return `${getOrigin()}/api/banking/callback`;
}

/** Map an Enable Banking account to the fields we store on a FinancialAccount. */
export function mapEbAccount(acc: EbAccount): {
  name: string;
  type: AccountTypeValue;
  currency: string;
} {
  const iban = acc.account_id?.iban;
  const masked = iban ? `••${iban.slice(-4)}` : undefined;
  const name = acc.name?.trim() || masked || "Bank account";
  // Enable Banking's cash_account_type is ISO 20022 (CACC, SVGS, CARD, …).
  let type: AccountTypeValue = "CHECKING";
  if (acc.cash_account_type === "SVGS") type = "SAVINGS";
  else if (acc.cash_account_type === "CARD") type = "CREDIT";
  return { name, type, currency: acc.currency ?? "EUR" };
}
