"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "./actions";
import { TransactionFilters, type CategoryOption } from "./transaction-filters";

export type TransactionItem = {
  id: string;
  date: string; // yyyy-mm-dd (UTC)
  description: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  importSource: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  accountId: string | null;
  accountName: string | null;
};

export type AccountOption = { id: string; name: string; isDefault: boolean };

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string) {
  return dateFmt.format(new Date(`${iso}T00:00:00.000Z`));
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function TransactionManager({
  transactions,
  categories,
  accounts,
  month,
  category,
}: {
  transactions: TransactionItem[];
  categories: CategoryOption[];
  accounts: AccountOption[];
  month: string;
  category: string;
}) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransactionItem | null>(null);
  const [deleting, setDeleting] = React.useState<TransactionItem | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Track your income and expenses.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          Add transaction
        </Button>
      </div>

      <TransactionFilters
        month={month}
        category={category}
        categories={categories}
      />

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No transactions for this month.
          </p>
          <Button onClick={openCreate} className="mt-4">
            <PlusIcon />
            Add your first transaction
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.description || (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.categoryName ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: t.categoryColor ?? "#e5e7eb",
                          }}
                        />
                        {t.categoryName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">
                        Uncategorised
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums",
                      t.type === "INCOME"
                        ? "text-green-600"
                        : t.type === "EXPENSE"
                          ? "text-red-600"
                          : "text-foreground",
                    )}
                  >
                    {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                    {eur.format(t.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.importSource === "ai_import" ? (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-700">
                        AI
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(t);
                          setFormOpen(true);
                        }}
                        aria-label="Edit transaction"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(t)}
                        aria-label="Delete transaction"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        categories={categories}
        accounts={accounts}
      />
      <DeleteTransactionDialog
        transaction={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionItem | null;
  categories: CategoryOption[];
  accounts: AccountOption[];
}) {
  const isEdit = transaction !== null;
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? "";
  const [type, setType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setType(transaction?.type === "INCOME" ? "INCOME" : "EXPENSE");
      setError(null);
    }
  }, [open, transaction]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("type", type);
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateTransaction(formData)
        : await createTransaction(formData);
      if (!result.ok) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this transaction."
              : "Record a new income or expense."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={transaction.id} />}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border text-sm font-medium transition",
                type === "EXPENSE"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-input hover:bg-accent",
              )}
              aria-pressed={type === "EXPENSE"}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={cn(
                "flex h-9 items-center justify-center rounded-md border text-sm font-medium transition",
                type === "INCOME"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-input hover:bg-accent",
              )}
              aria-pressed={type === "INCOME"}
            >
              Income
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (€)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={transaction?.amount ?? ""}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category</Label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={transaction?.categoryId ?? ""}
              className={selectClass}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">Account</Label>
            {accounts.length > 0 ? (
              <select
                id="accountId"
                name="accountId"
                defaultValue={
                  isEdit ? (transaction?.accountId ?? "") : defaultAccountId
                }
                className={selectClass}
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground">
                No accounts yet — you can add one later. This transaction will be
                saved without an account.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={transaction?.description ?? ""}
              placeholder="Optional"
              maxLength={140}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={transaction?.date ?? todayIso()}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTransactionDialog({
  transaction,
  onOpenChange,
}: {
  transaction: TransactionItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleDelete() {
    if (!transaction) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog
      open={transaction !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete transaction?</DialogTitle>
          <DialogDescription>
            This permanently removes
            {transaction?.description ? ` “${transaction.description}”` : " this"}
            {transaction ? ` (${eur.format(transaction.amount)})` : ""}. This
            can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
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
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
