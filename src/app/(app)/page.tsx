import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountsWithBalances } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import {
  currentMonthKey,
  eur,
  formatDate,
  formatShortMonth,
  monthRange,
  pad2,
  shiftMonth,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MonthPicker } from "./month-picker";
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

// Accept a YYYY-MM search param; fall back to the current month otherwise.
function resolveMonth(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonthKey();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
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
        accountId: true,
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

  // --- Selected-month summary, with last-month comparison --------------------
  // The month picker (URL `?month=`) sets the context for the whole page.
  const selectedMonth = resolveMonth(searchParams?.month);
  const prevMonth = shiftMonth(selectedMonth, -1);
  const { start, end } = monthRange(selectedMonth);
  const { start: prevStart } = monthRange(prevMonth); // prev end === start

  const openingTotal = accounts.reduce((sum, a) => sum + a.openingBalance, 0);

  let income = 0;
  let expense = 0;
  let prevIncome = 0;
  let prevExpense = 0;
  // Accounted cash flow (only transactions tied to an account count toward net
  // worth, matching getAccountsWithBalances) accumulated up to each cutoff.
  let flowBeforeEnd = 0; // → net worth at end of selected month
  let flowBeforeStart = 0; // → net worth at end of previous month
  for (const t of transactions) {
    const amt = t.amount.toNumber();
    const signed = t.type === "INCOME" ? amt : t.type === "EXPENSE" ? -amt : 0;

    if (t.date >= start && t.date < end) {
      if (t.type === "INCOME") income += amt;
      else if (t.type === "EXPENSE") expense += amt;
    } else if (t.date >= prevStart && t.date < start) {
      if (t.type === "INCOME") prevIncome += amt;
      else if (t.type === "EXPENSE") prevExpense += amt;
    }

    if (t.accountId) {
      if (t.date < end) flowBeforeEnd += signed;
      if (t.date < start) flowBeforeStart += signed;
    }
  }
  const net = income - expense;
  const prevNet = prevIncome - prevExpense;
  const netWorth = openingTotal + flowBeforeEnd;
  const prevNetWorth = openingTotal + flowBeforeStart;

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

  // --- Donut: selected-month expenses by category ---------------------------
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Dashboard</h1>
        <MonthPicker month={selectedMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total income"
          value={income}
          previous={prevIncome}
          tone="income"
          goodWhenUp
        />
        <StatCard
          label="Total expenses"
          value={expense}
          previous={prevExpense}
          tone="expense"
          goodWhenUp={false}
        />
        <StatCard
          label="Net balance"
          value={net}
          previous={prevNet}
          negative={net < 0}
          goodWhenUp
        />
        <StatCard
          label="Total net worth"
          value={netWorth}
          previous={prevNetWorth}
          negative={netWorth < 0}
          goodWhenUp
          deltaMode="delta"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseBar series={barSeries} />
        </div>
        <SpendingDonut data={donutData} month={selectedMonth} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BalanceLineChart transactions={txMini} month={selectedMonth} />
        </div>
        <BudgetProgress
          transactions={txMini}
          budgets={budgetItems}
          month={selectedMonth}
        />
      </div>

      <RecentTransactions recent={recent} />
    </div>
  );
}

function StatCard({
  label,
  value,
  previous,
  negative,
  tone,
  goodWhenUp = true,
  deltaMode = "compare",
}: {
  label: string;
  value: number;
  previous: number;
  negative?: boolean;
  tone?: "income" | "expense";
  goodWhenUp?: boolean;
  // "compare": show the delta + % vs last month; "delta": absolute change only.
  deltaMode?: "compare" | "delta";
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
        <Comparison
          value={value}
          previous={previous}
          goodWhenUp={goodWhenUp}
          showPercent={deltaMode === "compare"}
        />
      </div>
    </Card>
  );
}

// Small "vs last month" line beneath a stat: a signed delta (currency, and an
// optional percentage) coloured by whether the move is favourable.
function Comparison({
  value,
  previous,
  goodWhenUp,
  showPercent,
}: {
  value: number;
  previous: number;
  goodWhenUp: boolean;
  showPercent: boolean;
}) {
  const diff = Math.round((value - previous) * 100) / 100;

  if (diff === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">No change vs last month</p>
    );
  }

  const up = diff > 0;
  const good = up === goodWhenUp;
  const Arrow = up ? ArrowUp : ArrowDown;
  const pct =
    showPercent && previous !== 0
      ? Math.round((diff / Math.abs(previous)) * 100)
      : null;

  return (
    <p className="mt-2 flex items-center gap-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium tabular-nums",
          good ? "text-[#1aae39]" : "text-[#e5484d]",
        )}
      >
        <Arrow className="h-3 w-3" />
        {eur.format(Math.abs(diff))}
        {pct !== null && ` (${Math.abs(pct)}%)`}
      </span>
      <span className="text-muted-foreground">vs last month</span>
    </p>
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
