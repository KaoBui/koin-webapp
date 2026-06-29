import { prisma } from "@/lib/prisma";
import type { AccountTypeValue } from "@/lib/account-constants";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: AccountTypeValue;
  currency: string;
  isDefault: boolean;
  openingBalance: number; // editable, stored on the account
  computedBalance: number; // derived: opening + income - expense
  transactionCount: number;
};

/**
 * Fetch a user's accounts with their *derived* balances. `balance` on the
 * account is treated as the opening balance; the current balance is computed as
 * `opening + sum(INCOME) - sum(EXPENSE)` over that account's transactions.
 *
 * This is the single source of truth for account balances — use it anywhere an
 * account balance is shown (accounts page, dashboard, etc.).
 */
export async function getAccountsWithBalances(
  userId: string,
): Promise<AccountWithBalance[]> {
  const [accounts, grouped] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { transactions: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const totals = new Map<string, { income: number; expense: number }>();
  for (const row of grouped) {
    if (!row.accountId) continue;
    const entry = totals.get(row.accountId) ?? { income: 0, expense: 0 };
    const sum = row._sum.amount?.toNumber() ?? 0;
    if (row.type === "INCOME") entry.income += sum;
    else if (row.type === "EXPENSE") entry.expense += sum;
    totals.set(row.accountId, entry);
  }

  return accounts.map((account) => {
    const openingBalance = account.balance.toNumber();
    const { income, expense } = totals.get(account.id) ?? {
      income: 0,
      expense: 0,
    };
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      isDefault: account.isDefault,
      openingBalance,
      computedBalance: openingBalance + income - expense,
      transactionCount: account._count.transactions,
    };
  });
}
