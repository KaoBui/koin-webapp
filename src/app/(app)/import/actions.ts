"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { normalizeMerchantKey } from "@/lib/merchant-rules";
import {
  parseAmount,
  parseTransactionDate,
  isTransactionType,
  normalizeDescription,
} from "@/lib/transactions";

export type ImportRow = {
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string | null;
  accountId: string | null;
};

export const saveImportedTransactions = action(
  async (
    userId,
    rows: ImportRow[],
  ): Promise<ActionResult<{ count: number }>> => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: "No transactions selected." };
    }

    // Validate category/account ownership in bulk.
    const [categories, accounts] = await Promise.all([
      prisma.category.findMany({ where: { userId }, select: { id: true } }),
      prisma.financialAccount.findMany({
        where: { userId },
        select: { id: true },
      }),
    ]);
    const categoryIds = new Set(categories.map((c) => c.id));
    const accountIds = new Set(accounts.map((a) => a.id));

    const data = [];
    // Merchant memory: map normalized merchant key -> the category the user
    // confirmed for it. Deduped so the last occurrence in the batch wins, then
    // upserted after the inserts so each correction overwrites the prior rule.
    const merchantRules = new Map<string, string>();
    for (const row of rows) {
      const amount = parseAmount(row.amount);
      if (amount == null) {
        return {
          ok: false,
          error: `Invalid amount for "${row.description || "transaction"}".`,
        };
      }
      if (!isTransactionType(row.type)) {
        return { ok: false, error: "Each transaction must be income or expense." };
      }
      const date = parseTransactionDate(row.date);
      if (!date) {
        return {
          ok: false,
          error: `Invalid date for "${row.description || "transaction"}".`,
        };
      }

      const categoryId =
        row.categoryId && categoryIds.has(row.categoryId)
          ? row.categoryId
          : null;

      data.push({
        userId,
        amount,
        type: row.type,
        date,
        // Bulk import truncates long descriptions rather than rejecting the
        // whole batch over one oversized AI-parsed string.
        description: normalizeDescription(row.description),
        categoryId,
        accountId:
          row.accountId && accountIds.has(row.accountId) ? row.accountId : null,
        importSource: "ai_import",
      });

      // Only learn a mapping when the user kept/assigned a real category.
      const merchantKey = normalizeMerchantKey(row.description);
      if (merchantKey && categoryId) {
        merchantRules.set(merchantKey, categoryId);
      }
    }

    await prisma.transaction.createMany({ data });

    // Upsert one rule per merchant; the @@unique([userId, merchantKey]) means a
    // new assignment for a known merchant overwrites the previous category.
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
    return { ok: true, data: { count: data.length } };
  },
);
