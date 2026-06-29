// Server-only budget helpers. Budgets in this app are a single recurring
// MONTHLY limit per category (not stored per calendar month); the month only
// changes which transactions count toward "spent".

import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/format";

export type BudgetRow = {
  categoryId: string;
  name: string;
  color: string | null;
  limit: number | null; // recurring monthly budget limit; null = unbudgeted
  spent: number; // EXPENSE total for this category in the selected month
};

export type BudgetData = {
  rows: BudgetRow[];
  income: number; // INCOME total for the selected month
};

/**
 * Upsert/clear a category's single MONTHLY budget limit. Passing `null` (or a
 * non-positive amount) removes the limit, moving the category to "unbudgeted".
 */
export async function setMonthlyBudget(
  userId: string,
  categoryId: string,
  limit: number | null,
) {
  const existing = await prisma.budget.findFirst({
    where: { userId, categoryId, period: "MONTHLY" },
  });

  if (limit == null || limit <= 0) {
    if (existing) await prisma.budget.delete({ where: { id: existing.id } });
    return;
  }

  if (existing) {
    await prisma.budget.update({
      where: { id: existing.id },
      data: { limitAmount: limit },
    });
  } else {
    await prisma.budget.create({
      data: {
        userId,
        categoryId,
        limitAmount: limit,
        period: "MONTHLY",
        startDate: new Date(),
      },
    });
  }
}

/**
 * Build the budget data for a given month (yyyy-mm): one row per category
 * (`limit` is the recurring monthly budget or null, `spent` is the category's
 * EXPENSE total within the month) plus the month's total INCOME.
 */
export async function getBudgetData(
  userId: string,
  month: string,
): Promise<BudgetData> {
  const { start, end } = monthRange(month);

  const [categories, budgets, transactions] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true },
    }),
    prisma.budget.findMany({
      where: { userId, period: "MONTHLY" },
      select: { categoryId: true, limitAmount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { categoryId: true, amount: true, type: true },
    }),
  ]);

  const limitByCategory = new Map<string, number>();
  for (const b of budgets) {
    limitByCategory.set(b.categoryId, b.limitAmount.toNumber());
  }

  const spentByCategory = new Map<string, number>();
  let income = 0;
  for (const t of transactions) {
    const amount = t.amount.toNumber();
    if (t.type === "INCOME") {
      income += amount;
    } else if (t.type === "EXPENSE" && t.categoryId) {
      spentByCategory.set(
        t.categoryId,
        (spentByCategory.get(t.categoryId) ?? 0) + amount,
      );
    }
  }

  const rows = categories.map((c) => ({
    categoryId: c.id,
    name: c.name,
    color: c.color,
    limit: limitByCategory.get(c.id) ?? null,
    spent: spentByCategory.get(c.id) ?? 0,
  }));

  return { rows, income };
}
