"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { getBudgetData, setMonthlyBudget, type BudgetData } from "@/lib/budgets";

const MONTH_RE = /^\d{4}-\d{2}$/;

function parseLimit(raw: number | null): number | null {
  if (raw == null) return null;
  if (!Number.isFinite(raw) || raw < 0) return null;
  // Round to cents — amounts are stored as Decimal(14, 2).
  const rounded = Math.round(raw * 100) / 100;
  return rounded === 0 ? null : rounded;
}

/**
 * Fetch the budget-vs-spend rows for a month. Used by the client to refetch on
 * month navigation (list/read, but exposed as an action for the auth wrapper).
 */
export const getBudgets = action(
  async (userId, month: string): Promise<ActionResult<BudgetData>> => {
    if (!MONTH_RE.test(month)) {
      return { ok: false, error: "Invalid month." };
    }
    const data = await getBudgetData(userId, month);
    return { ok: true, data };
  },
);

/**
 * Set (or clear, when `limit` is null/0) a category's recurring monthly budget
 * limit. Returns the limit actually stored so the client can sync its UI.
 */
export const setBudgetLimit = action(
  async (
    userId,
    categoryId: string,
    limit: number | null,
  ): Promise<ActionResult<{ limit: number | null }>> => {
    if (!categoryId) return { ok: false, error: "Missing category." };

    // Ownership check — scope strictly to the signed-in user.
    const owned = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!owned) return { ok: false, error: "Category not found." };

    const parsed = parseLimit(limit);
    await setMonthlyBudget(userId, categoryId, parsed);

    revalidateFinance();
    return { ok: true, data: { limit: parsed } };
  },
);
