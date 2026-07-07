"use server";

import { Prisma } from "@prisma/client";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { normalizeMerchantKey } from "@/lib/merchant-rules";
import {
  parseAmount,
  parseTransactionDate,
  isTransactionType,
  normalizeDescription,
} from "@/lib/transactions";

export type ReviewRow = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
};

/**
 * Resolve a batch of pending (bank-synced) transactions: `approve` rows are
 * copied into the ledger with the user's edits; `reject` ids are discarded.
 * Both leave the review queue. The account and the bank transaction id come
 * from the stored pending row (never the client) so they can't be tampered
 * with; only the editable fields are taken from the client.
 */
export const resolvePending = action(
  async (
    userId,
    input: { approve: ReviewRow[]; reject: string[] },
  ): Promise<ActionResult<{ added: number }>> => {
    const approve = Array.isArray(input?.approve) ? input.approve : [];
    const reject = Array.isArray(input?.reject) ? input.reject : [];

    // Load the referenced pending rows, scoped to this user (ownership check).
    const ids = [...approve.map((r) => r.id), ...reject];
    const pending = await prisma.pendingTransaction.findMany({
      where: { id: { in: ids }, userId },
    });
    const byId = new Map(pending.map((p) => [p.id, p]));

    const validCategories = new Set(
      (
        await prisma.category.findMany({ where: { userId }, select: { id: true } })
      ).map((c) => c.id),
    );

    const data: Prisma.TransactionCreateManyInput[] = [];
    const approvedIds: string[] = [];
    const merchantRules = new Map<string, string>();

    for (const row of approve) {
      const p = byId.get(row.id);
      if (!p) continue; // not owned or already resolved — skip silently

      const amount = parseAmount(row.amount);
      if (amount == null) {
        return { ok: false, error: `Invalid amount for "${row.description || "transaction"}".` };
      }
      if (!isTransactionType(row.type)) {
        return { ok: false, error: "Each transaction must be income or expense." };
      }
      const date = parseTransactionDate(row.date);
      if (!date) {
        return { ok: false, error: `Invalid date for "${row.description || "transaction"}".` };
      }
      const categoryId =
        row.categoryId && validCategories.has(row.categoryId) ? row.categoryId : null;

      data.push({
        userId,
        accountId: p.accountId,
        categoryId,
        amount,
        type: row.type,
        date,
        description: normalizeDescription(row.description),
        externalId: p.externalId,
        importSource: "bank_sync",
      });
      approvedIds.push(p.id);

      const merchantKey = normalizeMerchantKey(row.description);
      if (merchantKey && categoryId) merchantRules.set(merchantKey, categoryId);
    }

    const rejectIds = reject.filter((id) => byId.has(id));

    await prisma.$transaction(async (tx) => {
      if (data.length > 0) {
        await tx.transaction.createMany({ data, skipDuplicates: true });
      }
      // Approved rows have moved to the ledger (their externalId now dedups
      // against Transaction), so they can leave the queue entirely.
      if (approvedIds.length > 0) {
        await tx.pendingTransaction.deleteMany({
          where: { id: { in: approvedIds }, userId },
        });
      }
      // Rejected rows stay as hidden REJECTED tombstones so their externalId
      // keeps blocking a future sync from re-staging them.
      if (rejectIds.length > 0) {
        await tx.pendingTransaction.updateMany({
          where: { id: { in: rejectIds }, userId },
          data: { status: "REJECTED" },
        });
      }
    });

    // Learn merchant → category mappings, same as AI import.
    await Promise.all(
      Array.from(merchantRules, ([merchantKey, categoryId]) =>
        prisma.merchantRule.upsert({
          where: { userId_merchantKey: { userId, merchantKey } },
          create: { userId, merchantKey, categoryId },
          update: { categoryId },
        }),
      ),
    );

    revalidateFinance();
    return { ok: true, data: { added: data.length } };
  },
);
