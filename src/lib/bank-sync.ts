import { createHash } from "crypto";
import type { BankConnection } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getTransactions, type EbTransaction } from "@/lib/enablebanking";
import { normalizeMerchantKey } from "@/lib/merchant-rules";
import { parseAmount, normalizeDescription } from "@/lib/transactions";

// On the first sync we pull this many days of history. Later syncs pull from the
// last sync minus a small overlap so late-booked items aren't missed (dedup on
// externalId makes the overlap harmless).
const INITIAL_HISTORY_DAYS = 90;
const OVERLAP_DAYS = 3;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build the row description from remittance info, falling back to counterparty. */
function describe(t: EbTransaction): string | null {
  const remittance = t.remittance_information?.filter(Boolean).join(" ").trim();
  const counterparty =
    t.credit_debit_indicator === "CRDT" ? t.debtor?.name : t.creditor?.name;
  return normalizeDescription(remittance || counterparty || "");
}

/** A stable per-transaction id for dedup. Prefer the bank's entry_reference;
 * fall back to a hash of the immutable fields when the bank omits it. */
function externalId(accountUid: string, t: EbTransaction): string {
  if (t.entry_reference) return t.entry_reference;
  const basis = [
    accountUid,
    t.booking_date ?? t.value_date ?? t.transaction_date ?? "",
    t.transaction_amount.amount,
    t.credit_debit_indicator,
    (t.remittance_information ?? []).join("|"),
  ].join("~");
  return `gen:${createHash("sha256").update(basis).digest("hex").slice(0, 32)}`;
}

/** Parse a bank transaction into a PendingTransaction row, or null if unusable. */
function toRow(
  conn: BankConnection,
  t: EbTransaction,
  ruleFor: (desc: string | null) => string | null,
) {
  // Only import booked transactions; pending ones can change or vanish.
  if (t.status && t.status !== "BOOK" && t.status !== "BOOK ") return null;

  const amount = parseAmount(t.transaction_amount.amount);
  if (amount == null) return null;

  const dateStr = t.booking_date ?? t.value_date ?? t.transaction_date;
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  const description = describe(t);
  return {
    userId: conn.userId,
    accountId: conn.financialAccountId,
    categoryId: ruleFor(description),
    amount,
    type: t.credit_debit_indicator === "CRDT" ? ("INCOME" as const) : ("EXPENSE" as const),
    date,
    description,
    externalId: externalId(conn.accountUid, t),
    aspspName: conn.aspspName,
  };
}

/**
 * Pull new transactions for a single bank connection into the review queue
 * (`PendingTransaction`). Idempotent: never re-stages a transaction already in
 * the queue OR already approved into the ledger. Returns how many rows were
 * newly staged for review.
 */
export async function syncConnection(conn: BankConnection): Promise<number> {
  // Load the user's merchant memory once and categorize by normalized key.
  const rules = await prisma.merchantRule.findMany({
    where: { userId: conn.userId },
    select: { merchantKey: true, categoryId: true },
  });
  const ruleMap = new Map(rules.map((r) => [r.merchantKey, r.categoryId]));
  const ruleFor = (desc: string | null) => {
    const key = normalizeMerchantKey(desc);
    return (key && ruleMap.get(key)) || null;
  };

  const from = new Date(conn.lastSyncedAt ?? new Date());
  from.setDate(
    from.getDate() - (conn.lastSyncedAt ? OVERLAP_DAYS : INITIAL_HISTORY_DAYS),
  );

  // Page through all transactions since `from`.
  const rows: ReturnType<typeof toRow>[] = [];
  let continuationKey: string | undefined;
  do {
    const page = await getTransactions(conn.accountUid, {
      dateFrom: toDateOnly(from),
      continuationKey,
    });
    for (const t of page.transactions) {
      rows.push(toRow(conn, t, ruleFor));
    }
    continuationKey = page.continuation_key;
  } while (continuationKey);

  let data = rows.filter((r): r is NonNullable<typeof r> => r !== null);

  // Don't re-stage anything the user already approved into the ledger. (The
  // [userId, externalId] unique index handles items still sitting in the queue,
  // but approved rows leave the queue, so we filter those out explicitly.)
  if (data.length > 0) {
    const already = await prisma.transaction.findMany({
      where: { userId: conn.userId, externalId: { in: data.map((d) => d.externalId) } },
      select: { externalId: true },
    });
    const committed = new Set(already.map((a) => a.externalId));
    data = data.filter((d) => !committed.has(d.externalId));
  }

  let inserted = 0;
  if (data.length > 0) {
    // skipDuplicates relies on the unique [userId, externalId] index.
    const result = await prisma.pendingTransaction.createMany({
      data,
      skipDuplicates: true,
    });
    inserted = result.count;
  }

  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: { lastSyncedAt: new Date() },
  });

  return inserted;
}

/** Sync every bank connection for one user. Returns total rows inserted. One
 * failing bank doesn't abort the others; failures are collected. */
export async function syncUser(
  userId: string,
): Promise<{ inserted: number; errors: string[] }> {
  const connections = await prisma.bankConnection.findMany({ where: { userId } });
  let inserted = 0;
  const errors: string[] = [];
  for (const conn of connections) {
    try {
      inserted += await syncConnection(conn);
    } catch (err) {
      console.error(`Sync failed for connection ${conn.id}:`, err);
      errors.push(conn.aspspName);
    }
  }
  return { inserted, errors };
}
