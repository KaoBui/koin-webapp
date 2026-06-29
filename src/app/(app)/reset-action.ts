"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories } from "@/lib/categories";

/**
 * Wipe all of the signed-in user's data and return to a fresh state: deletes
 * transactions, budgets, financial accounts and categories, then re-seeds the
 * default categories. Everything is scoped to the user's id.
 */
export const resetAccount = action(
  async (userId): Promise<ActionResult> => {
    // Delete in FK-safe order, atomically.
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.budget.deleteMany({ where: { userId } }),
      prisma.financialAccount.deleteMany({ where: { userId } }),
      prisma.category.deleteMany({ where: { userId } }),
    ]);

    // Back to the default categories a fresh user would have.
    await ensureDefaultCategories(userId);

    revalidateFinance();
    return { ok: true };
  },
);
