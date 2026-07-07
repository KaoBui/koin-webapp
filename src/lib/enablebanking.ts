import { SignJWT, importPKCS8 } from "jose";

/**
 * Enable Banking (PSD2 AIS) client.
 *
 * Read-only access to bank accounts: we authenticate the *application* with an
 * RS256 JWT signed by our private key (the public cert is registered in the
 * Enable Banking Control Panel), then drive the consent → session → transactions
 * flow. There is no per-user OAuth token here — the JWT authenticates the app,
 * and per-user access is represented by a `session_id` obtained after the user
 * consents at their bank.
 *
 * Docs: https://enablebanking.com/docs/api/reference/
 */

const APP_ID = process.env.ENABLE_BANKING_APP_ID;
const BASE_URL = process.env.ENABLE_BANKING_BASE_URL ?? "https://api.enablebanking.com";
// The private key may be provided as: a real multiline PEM, a single line with
// escaped "\n" sequences, or (most robust for .env on any OS) a base64-encoded
// PEM on one line. Normalize all three to a real PEM string.
function normalizeKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN")) return trimmed.replace(/\\n/g, "\n");
  // No PEM header present -> assume base64-encoded PEM.
  return Buffer.from(trimmed, "base64").toString("utf8");
}

const PRIVATE_KEY_PEM = normalizeKey(process.env.ENABLE_BANKING_PRIVATE_KEY);

function requireConfig() {
  if (!APP_ID || !PRIVATE_KEY_PEM) {
    throw new Error(
      "Enable Banking is not configured. Set ENABLE_BANKING_APP_ID and ENABLE_BANKING_PRIVATE_KEY.",
    );
  }
  return { appId: APP_ID, keyPem: PRIVATE_KEY_PEM };
}

// Cache the signed application JWT in module scope. Tokens live up to 24h; we
// mint a fresh one well before expiry. Signing is cheap but importing the key
// per request is wasteful, so we keep both around.
let cached: { token: string; expiresAt: number } | null = null;

async function getAppJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const { appId, keyPem } = requireConfig();
  let key;
  try {
    key = await importPKCS8(keyPem, "RS256");
  } catch (err) {
    throw new Error(
      "Failed to load ENABLE_BANKING_PRIVATE_KEY. It must be a PKCS#8 PEM " +
        "(begins with '-----BEGIN PRIVATE KEY-----').",
      { cause: err },
    );
  }

  const ttl = 3600; // 1h; max allowed is 86400.
  const token = await new SignJWT({})
    .setProtectedHeader({ typ: "JWT", alg: "RS256", kid: appId })
    .setIssuer("enablebanking.com")
    .setAudience("api.enablebanking.com")
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .sign(key);

  cached = { token, expiresAt: now + ttl };
  return token;
}

async function ebFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | undefined> } = {},
): Promise<T> {
  const { query, ...rest } = init;
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, v);
    }
  }

  const token = await getAppJwt();
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...rest.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Enable Banking ${res.status} on ${path}: ${body}`);
  }
  return (await res.json()) as T;
}

// --- Types (only the fields we use) --------------------------------------

export interface Aspsp {
  name: string;
  country: string;
  logo?: string;
  psu_types?: string[];
}

export interface EbAccount {
  uid: string;
  account_id?: { iban?: string; other?: { identification?: string } };
  name?: string;
  currency?: string;
  cash_account_type?: string;
}

export interface EbSession {
  session_id: string;
  accounts: EbAccount[];
  aspsp: { name: string; country: string };
  access: { valid_until: string };
}

export interface EbAmount {
  currency: string;
  amount: string;
}

export interface EbTransaction {
  entry_reference?: string;
  transaction_amount: EbAmount;
  credit_debit_indicator: "CRDT" | "DBIT";
  status: string;
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
}

// --- Endpoints ------------------------------------------------------------

/** List banks (ASPSPs), optionally filtered by 2-letter country code. */
export function listAspsps(country?: string) {
  return ebFetch<{ aspsps: Aspsp[] }>("/aspsps", {
    query: { country, psu_type: "personal" },
  });
}

/**
 * Begin authorization. Returns a `url` to redirect the user to their bank, and
 * an `authorization_id`. `state` is echoed back to our callback so we can tie
 * the returned code to the user/connection we started.
 */
export function startAuth(params: {
  aspsp: { name: string; country: string };
  redirectUrl: string;
  state: string;
  validUntil: string; // ISO datetime — how long consent should last
}) {
  return ebFetch<{ url: string; authorization_id: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({
      aspsp: params.aspsp,
      access: { valid_until: params.validUntil },
      state: params.state,
      redirect_url: params.redirectUrl,
      psu_type: "personal",
    }),
  });
}

/** Exchange the callback `code` for a session (which lists the user's accounts). */
export function createSession(code: string) {
  return ebFetch<EbSession>("/sessions", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/** Fetch transactions for one account, optionally from a start date (YYYY-MM-DD). */
export function getTransactions(
  accountUid: string,
  opts: { dateFrom?: string; continuationKey?: string } = {},
) {
  return ebFetch<{ transactions: EbTransaction[]; continuation_key?: string }>(
    `/accounts/${accountUid}/transactions`,
    { query: { date_from: opts.dateFrom, continuation_key: opts.continuationKey } },
  );
}
