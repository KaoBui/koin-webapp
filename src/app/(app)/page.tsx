import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import {
  currentMonthKey,
  eur,
  formatDate,
  formatMonthLabel,
  formatShortMonth,
  monthRange,
  pad2,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { IncomeExpenseBar } from "./income-expense-bar";
import { SpendingDonut } from "./spending-donut";
import { BalanceLineChart } from "./balance-line-chart";
import { BudgetProgress } from "./budget-progress";
import type {
  BarDatum,
  BudgetItem,
  DonutDatum,
  RecentTx,
  TxMini,
} from "./dashboard-types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [accounts, transactions, budgets] = await Promise.all([
    getAccountsWithBalances(userId),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        date: true,
        amount: true,
        type: true,
        description: true,
        categoryId: true,
        category: { select: { name: true, color: true, icon: true } },
      },
    }),
    prisma.budget.findMany({
      where: { userId, period: "MONTHLY" },
      select: {
        categoryId: true,
        limitAmount: true,
        category: { select: { name: true, color: true, icon: true } },
      },
    }),
  ]);

  const netWorth = accounts.reduce((sum, a) => sum + a.computedBalance, 0);

  // --- Current-month summary -------------------------------------------------
  const thisMonth = currentMonthKey();
  const { start, end } = monthRange(thisMonth);
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.date >= start && t.date < end) {
      const amt = t.amount.toNumber();
      if (t.type === "INCOME") income += amt;
      else if (t.type === "EXPENSE") expense += amt;
    }
  }
  const net = income - expense;

  // --- Bar series: trailing 12 months ---------------------------------------
  const now = new Date();
  const barSeries: BarDatum[] = [];
  const barIndex = new Map<string, BarDatum>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
    const datum: BarDatum = {
      month: key,
      label: formatShortMonth(d),
      income: 0,
      expense: 0,
    };
    barSeries.push(datum);
    barIndex.set(key, datum);
  }
  for (const t of transactions) {
    const datum = barIndex.get(t.date.toISOString().slice(0, 7));
    if (!datum) continue;
    const amt = t.amount.toNumber();
    if (t.type === "INCOME") datum.income += amt;
    else if (t.type === "EXPENSE") datum.expense += amt;
  }

  // --- Donut: current-month expenses by category ----------------------------
  const donutMap = new Map<string, DonutDatum>();
  for (const t of transactions) {
    if (t.type !== "EXPENSE") continue;
    if (!(t.date >= start && t.date < end)) continue;
    const key = t.categoryId ?? "__none__";
    const amt = t.amount.toNumber();
    const existing = donutMap.get(key);
    if (existing) {
      existing.value += amt;
    } else {
      donutMap.set(key, {
        name: t.category?.name ?? "Uncategorised",
        color: t.category?.color ?? "#94a3b8",
        value: amt,
      });
    }
  }
  const donutData = Array.from(donutMap.values()).sort(
    (a, b) => b.value - a.value,
  );

  // --- Data for the month-switching widgets ---------------------------------
  const txMini: TxMini[] = transactions.map((t) => ({
    date: t.date.toISOString().slice(0, 10),
    amount: t.amount.toNumber(),
    type: t.type,
    categoryId: t.categoryId,
  }));

  const budgetItems: BudgetItem[] = budgets.map((b) => ({
    categoryId: b.categoryId,
    name: b.category.name,
    color: b.category.color,
    icon: b.category.icon,
    limit: b.limitAmount.toNumber(),
  }));

  const recent: RecentTx[] = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    description: t.description,
    amount: t.amount.toNumber(),
    type: t.type,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Dashboard</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {formatMonthLabel(thisMonth)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total income" value={income} tone="income" />
        <StatCard label="Total expenses" value={expense} tone="expense" />
        <StatCard label="Net balance" value={net} negative={net < 0} />
        <StatCard
          label="Total net worth"
          value={netWorth}
          negative={netWorth < 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseBar series={barSeries} />
        </div>
        <SpendingDonut data={donutData} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BalanceLineChart transactions={txMini} />
        </div>
        <BudgetProgress transactions={txMini} budgets={budgetItems} />
      </div>

      <RecentTransactions recent={recent} />
    </div>
  );
}

function StatCard({
  label,
  value,
  negative,
  tone,
}: {
  label: string;
  value: number;
  negative?: boolean;
  tone?: "income" | "expense";
}) {
  return (
    <Card>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1.5 text-2xl font-bold tabular-nums tracking-[-0.01em]",
            tone === "income" && "text-[#1aae39]",
            negative && "text-[#e5484d]",
          )}
        >
          {eur.format(value)}
        </p>
      </div>
    </Card>
  );
}

function RecentTransactions({ recent }: { recent: RecentTx[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Recent transactions</CardTitle>
        <Link
          href="/transactions"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <ul className="divide-y">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-20 shrink-0 text-muted-foreground">
                    {formatDate(t.date)}
                  </span>
                  <span className="truncate">
                    {t.description || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden items-center gap-2 text-muted-foreground sm:flex">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: t.categoryColor ?? "#cbd5e1" }}
                    />
                    {t.categoryName ?? "Uncategorised"}
                  </span>
                  <span
                    className={cn(
                      "w-24 text-right font-medium tabular-nums",
                      t.type === "INCOME" && "text-[#1aae39]",
                    )}
                  >
                    {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                    {eur.format(t.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
