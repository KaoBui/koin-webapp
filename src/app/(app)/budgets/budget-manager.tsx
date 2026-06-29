"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { eur } from "@/lib/format";
import type { BudgetRow } from "@/lib/budgets";
import { Card } from "@/components/ui/card";

import { MonthSwitcher } from "../month-switcher";
import { BudgetDonut, type BudgetShare } from "./budget-donut";
import { getBudgets, setBudgetLimit } from "./actions";

export function BudgetManager({
  initialMonth,
  initialRows,
  initialIncome,
}: {
  initialMonth: string;
  initialRows: BudgetRow[];
  initialIncome: number;
}) {
  const [month, setMonth] = React.useState(initialMonth);
  const [rows, setRows] = React.useState<BudgetRow[]>(initialRows);
  const [income, setIncome] = React.useState(initialIncome);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Inline-edit state: which category's budget cell is open, if any.
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Guard against stale month responses landing out of order.
  const latestMonth = React.useRef(month);

  function changeMonth(next: string) {
    setMonth(next);
    setEditingId(null);
    setError(null);
    latestMonth.current = next;
    setLoading(true);
    getBudgets(next)
      .then((result) => {
        if (latestMonth.current !== next) return; // superseded
        if (result.ok) {
          setRows(result.data.rows);
          setIncome(result.data.income);
        } else {
          setError(result.error);
        }
      })
      .finally(() => {
        if (latestMonth.current === next) setLoading(false);
      });
  }

  // --- Derived totals --------------------------------------------------------
  const totalBudget = rows.reduce((sum, r) => sum + (r.limit ?? 0), 0);
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);
  const leftToSpend = totalBudget - totalSpent;
  // Income left over after every budget is funded.
  const spareMoney = income - totalBudget;
  const sparePct = income > 0 ? Math.round((spareMoney / income) * 100) : 0;

  // --- Ordered rows: budgeted (by name), divider, unbudgeted (by name) ------
  const byName = (a: BudgetRow, b: BudgetRow) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const budgeted = rows.filter((r) => r.limit != null).sort(byName);
  const unbudgeted = rows.filter((r) => r.limit == null).sort(byName);
  const maxUnbudgetedSpent = Math.max(0, ...unbudgeted.map((r) => r.spent));

  // Pie data: each budgeted category's share of the total budget.
  const budgetShares: BudgetShare[] = budgeted.map((r) => ({
    name: r.name,
    color: r.color ?? "#cbd5e1",
    value: r.limit as number,
  }));

  // Flat display order for Tab navigation between budget inputs.
  const orderedIds = [...budgeted, ...unbudgeted].map((r) => r.categoryId);

  // --- Editing helpers -------------------------------------------------------
  function commit(categoryId: string, raw: string, moveNextId?: string) {
    const original = rows.find((r) => r.categoryId === categoryId)?.limit ?? null;

    const trimmed = raw.trim();
    let newLimit: number | null;
    if (trimmed === "") {
      newLimit = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        // Invalid input — cancel the edit, keep the previous value.
        setEditingId(moveNextId ?? null);
        return;
      }
      newLimit = n === 0 ? null : Math.round(n * 100) / 100;
    }

    // Optimistic update + move to the next cell (or close) immediately.
    setRows((prev) =>
      prev.map((r) =>
        r.categoryId === categoryId ? { ...r, limit: newLimit } : r,
      ),
    );
    setEditingId(moveNextId ?? null);

    if (newLimit === original) return; // no change to persist

    setError(null);
    setBudgetLimit(categoryId, newLimit)
      .then((result) => {
        if (result.ok) {
          setRows((prev) =>
            prev.map((r) =>
              r.categoryId === categoryId
                ? { ...r, limit: result.data.limit }
                : r,
            ),
          );
        } else {
          // Revert on failure.
          setRows((prev) =>
            prev.map((r) =>
              r.categoryId === categoryId ? { ...r, limit: original } : r,
            ),
          );
          setError(result.error);
        }
      })
      .catch(() => {
        setRows((prev) =>
          prev.map((r) =>
            r.categoryId === categoryId ? { ...r, limit: original } : r,
          ),
        );
        setError("Couldn't save budget. Please try again.");
      });
  }

  function nextIdAfter(categoryId: string): string | undefined {
    const idx = orderedIds.indexOf(categoryId);
    return idx === -1 ? undefined : orderedIds[idx + 1];
  }

  // --- Empty state -----------------------------------------------------------
  if (rows.length === 0) {
    return (
      <div>
        <Header month={month} onMonthChange={changeMonth} />
        <div className="rounded-2xl border bg-muted/60 p-12 text-center">
          <p className="text-[15px] text-muted-foreground">
            You don&apos;t have any categories yet. Budgets are set per category.
          </p>
          <Link
            href="/categories"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Create a category →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header month={month} onMonthChange={changeMonth} />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Stat label="Total budget" value={totalBudget} />
          <Stat
            label="Spare money"
            value={spareMoney}
            negative={spareMoney < 0}
            hint={`${sparePct}% of income`}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Stat label="Total spent" value={totalSpent} />
          <Stat
            label="Left to spend"
            value={leftToSpend}
            negative={leftToSpend < 0}
          />
        </div>
        <Card>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Budget allocation
            </p>
            <div className="mt-2">
              <BudgetDonut data={budgetShares} />
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Budget</th>
              <th className="w-40 px-4 py-2.5 font-medium">Progress</th>
              <th className="px-4 py-2.5 text-right font-medium">Spent</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Left to spend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <SkeletonRows />
            ) : (
              <>
                {budgeted.map((row) => (
                  <BudgetTableRow
                    key={row.categoryId}
                    row={row}
                    totalBudget={totalBudget}
                    totalSpent={totalSpent}
                    maxUnbudgetedSpent={maxUnbudgetedSpent}
                    editing={editingId === row.categoryId}
                    onStartEdit={() => setEditingId(row.categoryId)}
                    onCommit={(raw, moveNext) =>
                      commit(
                        row.categoryId,
                        raw,
                        moveNext ? nextIdAfter(row.categoryId) : undefined,
                      )
                    }
                    onCancel={() => setEditingId(null)}
                  />
                ))}

                {unbudgeted.length > 0 && (
                  <tr className="bg-muted/20">
                    <td
                      colSpan={5}
                      className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70"
                    >
                      No budget set
                    </td>
                  </tr>
                )}

                {unbudgeted.map((row) => (
                  <BudgetTableRow
                    key={row.categoryId}
                    row={row}
                    totalBudget={totalBudget}
                    totalSpent={totalSpent}
                    maxUnbudgetedSpent={maxUnbudgetedSpent}
                    editing={editingId === row.categoryId}
                    onStartEdit={() => setEditingId(row.categoryId)}
                    onCommit={(raw, moveNext) =>
                      commit(
                        row.categoryId,
                        raw,
                        moveNext ? nextIdAfter(row.categoryId) : undefined,
                      )
                    }
                    onCancel={() => setEditingId(null)}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (next: string) => void;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Budgets</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Set and monitor monthly limits per category.
        </p>
      </div>
      <MonthSwitcher value={month} onChange={onMonthChange} />
    </div>
  );
}

function Stat({
  label,
  value,
  negative,
  hint,
}: {
  label: string;
  value: number;
  negative?: boolean;
  hint?: string;
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
            negative && "text-[#e5484d]",
          )}
        >
          {eur.format(value)}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}

function BudgetTableRow({
  row,
  totalBudget,
  totalSpent,
  maxUnbudgetedSpent,
  editing,
  onStartEdit,
  onCommit,
  onCancel,
}: {
  row: BudgetRow;
  totalBudget: number;
  totalSpent: number;
  maxUnbudgetedSpent: number;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (raw: string, moveNext: boolean) => void;
  onCancel: () => void;
}) {
  const budgeted = row.limit != null;
  const left = budgeted ? (row.limit as number) - row.spent : 0;
  const over = budgeted && left < 0;

  // Share of the budget still available; clamps to 0% once overspent.
  const remainingPct =
    budgeted && (row.limit as number) > 0
      ? Math.max(0, Math.round((left / (row.limit as number)) * 100))
      : 0;

  const budgetShare =
    budgeted && totalBudget > 0
      ? Math.round(((row.limit as number) / totalBudget) * 100)
      : 0;
  const spentShare =
    totalSpent > 0 ? Math.round((row.spent / totalSpent) * 100) : 0;

  return (
    <tr className="hover:bg-muted/30">
      <td
        className="px-4 py-2.5"
        style={{
          borderLeft: `4px solid ${row.color ?? "#cbd5e1"}`,
        }}
      >
        <span className="font-medium">{row.name}</span>
      </td>

      <td className="px-4 py-2.5 align-top">
        {editing ? (
          <BudgetInput
            initial={row.limit}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded text-left tabular-nums hover:bg-accent hover:px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`Edit budget for ${row.name}`}
          >
            {budgeted ? (
              <>
                <span>{eur.format(row.limit as number)}</span>
                <span className="block text-xs text-muted-foreground">
                  {budgetShare}% of total budget
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/40">Set budget</span>
            )}
          </button>
        )}
      </td>

      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar
              budgeted={budgeted}
              spent={row.spent}
              limit={row.limit}
              maxUnbudgetedSpent={maxUnbudgetedSpent}
            />
          </div>
          {budgeted && (
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {remainingPct}%
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-2.5 text-right align-top tabular-nums">
        <span>{eur.format(row.spent)}</span>
        <span className="block text-xs text-muted-foreground">
          {spentShare}% of total spent
        </span>
      </td>

      <td
        className={cn(
          "px-4 py-2.5 text-right align-top tabular-nums",
          over && "text-[#e5484d]",
        )}
      >
        {budgeted ? (
          over ? (
            `−${eur.format(Math.abs(left))}`
          ) : (
            eur.format(left)
          )
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>
    </tr>
  );
}

function BudgetInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: number | null;
  onCommit: (raw: string, moveNext: boolean) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState(initial != null ? String(initial) : "");
  // Ensure a single commit per edit session (Enter/Tab fire before blur).
  const committed = React.useRef(false);

  function fire(moveNext: boolean) {
    if (committed.current) return;
    committed.current = true;
    onCommit(value, moveNext);
  }

  return (
    <input
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          fire(false);
        } else if (e.key === "Escape") {
          e.preventDefault();
          committed.current = true;
          onCancel();
        } else if (e.key === "Tab") {
          e.preventDefault();
          fire(true);
        }
      }}
      onBlur={() => fire(false)}
      className="h-8 w-28 rounded-md border border-input bg-transparent px-2 text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      placeholder="0.00"
      aria-label="Budget amount"
    />
  );
}

function ProgressBar({
  budgeted,
  spent,
  limit,
  maxUnbudgetedSpent,
}: {
  budgeted: boolean;
  spent: number;
  limit: number | null;
  maxUnbudgetedSpent: number;
}) {
  if (!budgeted) {
    // No upper bound — show a grey bar scaled against the biggest unbudgeted
    // spender so the row's relative spend reads at a glance.
    const width =
      maxUnbudgetedSpent > 0
        ? Math.max(4, (spent / maxUnbudgetedSpent) * 100)
        : 0;
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-muted-foreground/40"
          style={{ width: `${width}%` }}
        />
      </div>
    );
  }

  const pct = limit && limit > 0 ? (spent / limit) * 100 : 0;
  const color =
    pct >= 100 ? "bg-[#e5484d]" : pct >= 80 ? "bg-[#dd5b00]" : "bg-[#1aae39]";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3" style={{ borderLeft: "4px solid #e6e6e6" }}>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
          </td>
          <td className="px-4 py-3">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}
