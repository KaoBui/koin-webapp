"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { resolvePending, type ReviewRow } from "./actions";

type CategoryOption = { id: string; name: string };

export type PendingRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  accountName: string;
  aspspName: string;
};

type Draft = {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  accountName: string;
};

const selectClass =
  "flex w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function ReviewClient({
  rows,
  categories,
}: {
  rows: PendingRow[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<Draft[]>(
    rows.map((r) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      amount: String(r.amount),
      type: r.type,
      categoryId: r.categoryId,
      accountName: r.accountName,
    })),
  );
  // Ids the user trashed in this session — discarded (not added) on save.
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function updateRow(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeRow(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setRejected((prev) => [...prev, id]);
  }

  async function onSave() {
    setError(null);
    setSaving(true);
    const approve: ReviewRow[] = drafts.map((d) => ({
      id: d.id,
      date: d.date,
      description: d.description,
      amount: Number(d.amount),
      type: d.type,
      categoryId: d.categoryId || null,
    }));
    const result = await resolvePending({ approve, reject: rejected });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push("/transactions");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Review</h1>
        <div className="mt-6 rounded-2xl border bg-muted/60 p-12 text-center">
          <p className="text-[15px] text-muted-foreground">
            Nothing to review. Synced transactions will appear here for you to
            approve before they&apos;re added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Review</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {drafts.length} synced transaction{drafts.length === 1 ? "" : "s"} to
          review. Edit anything, remove what you don&apos;t want, then add the
          rest to your ledger.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="px-3 py-2.5 font-medium">Amount</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Account</th>
              <th className="w-8 px-3 py-2.5">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {drafts.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row.id, { date: e.target.value })}
                    className="h-8 w-[9.5rem]"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.id, { description: e.target.value })
                    }
                    className="h-8 min-w-[12rem]"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                    className="h-8 w-24"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.type}
                    onChange={(e) =>
                      updateRow(row.id, {
                        type: e.target.value as "INCOME" | "EXPENSE",
                      })
                    }
                    className={cn(selectClass, "h-8 w-28")}
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.categoryId}
                    onChange={(e) =>
                      updateRow(row.id, { categoryId: e.target.value })
                    }
                    className={cn(selectClass, "h-8 w-40")}
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.accountName}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={saving}
                    aria-label="Remove this transaction"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <TrashIcon />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={onSave}
          disabled={saving || drafts.length === 0}
          className="rounded-full px-5"
        >
          {saving
            ? "Adding…"
            : `Add ${drafts.length} transaction${drafts.length === 1 ? "" : "s"}`}
        </Button>
        {rejected.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {rejected.length} will be discarded
          </span>
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
