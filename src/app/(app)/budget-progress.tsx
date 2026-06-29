"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { currentMonthKey, eur } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSwitcher } from "./month-switcher";
import type { BudgetItem, TxMini } from "./dashboard-types";

export function BudgetProgress({
  transactions,
  budgets,
}: {
  transactions: TxMini[];
  budgets: BudgetItem[];
}) {
  const [month, setMonth] = React.useState(currentMonthKey());

  const spent = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "EXPENSE" || !t.categoryId) continue;
      if (!t.date.startsWith(month)) continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return map;
  }, [transactions, month]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Budgets</CardTitle>
        <MonthSwitcher value={month} onChange={setMonth} />
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No budgets yet. Set a monthly limit on a category to track it here.
          </p>
        ) : (
          <ul className="space-y-4">
            {budgets.map((b) => {
              const amount = spent.get(b.categoryId) ?? 0;
              const pct = b.limit > 0 ? (amount / b.limit) * 100 : 0;
              const over = amount > b.limit;
              return (
                <li key={b.categoryId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden>{b.icon ?? "🏷️"}</span>
                      <span className="truncate">{b.name}</span>
                    </span>
                    <span
                      className={cn(
                        "whitespace-nowrap tabular-nums",
                        over ? "text-[#e5484d]" : "text-muted-foreground",
                      )}
                    >
                      {eur.format(amount)} / {eur.format(b.limit)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        over ? "bg-[#e5484d]" : "bg-[#1aae39]",
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
