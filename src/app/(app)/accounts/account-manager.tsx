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
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/account-constants";
import type { AccountWithBalance } from "@/lib/accounts";

import { createAccount, deleteAccount, updateAccount } from "./actions";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function formatBalance(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function AccountManager({ accounts }: { accounts: AccountWithBalance[] }) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountWithBalance | null>(null);
  const [deleting, setDeleting] = React.useState<AccountWithBalance | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Accounts</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Your checking, savings, credit and cash accounts.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-full px-5">
          <PlusIcon />
          New account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border bg-muted/60 p-12 text-center">
          <p className="text-[15px] text-muted-foreground">
            You don&apos;t have any accounts yet.
          </p>
          <Button onClick={openCreate} className="mt-5 rounded-full px-5">
            <PlusIcon />
            Create your first account
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Currency</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Current balance
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {account.name}
                      {account.isDefault && (
                        <span className="rounded-full border bg-card px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Default
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {account.currency}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums",
                      account.computedBalance < 0 && "text-[#e5484d]",
                    )}
                  >
                    {formatBalance(account.computedBalance, account.currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(account);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${account.name}`}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(account)}
                        aria-label={`Delete ${account.name}`}
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

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
      />
      <DeleteAccountDialog
        account={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}

function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountWithBalance | null;
}) {
  const isEdit = account !== null;
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateAccount(formData)
        : await createAccount(formData);
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
          <DialogTitle>{isEdit ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this account's details."
              : "Add a checking, savings, credit or cash account."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={account.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={account?.name ?? ""}
              placeholder="e.g. Main checking"
              required
              autoFocus
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              defaultValue={account?.type ?? "CHECKING"}
              className={selectClass}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Opening balance</Label>
            <Input
              id="balance"
              name="balance"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={account?.openingBalance ?? ""}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Balance before you started tracking. Your current balance is
              calculated from transactions.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              defaultValue={account?.currency ?? "EUR"}
              placeholder="EUR"
              maxLength={3}
              className="uppercase"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              id="isDefault"
              name="isDefault"
              type="checkbox"
              defaultChecked={account?.isDefault ?? false}
              disabled={account?.isDefault ?? false}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <div className="space-y-0.5">
              <Label htmlFor="isDefault" className="font-normal">
                Default account
              </Label>
              <p className="text-xs text-muted-foreground">
                {account?.isDefault
                  ? "This is your default account. Set another account as default to change it."
                  : "Pre-selected when adding or importing transactions. Only one account can be default."}
              </p>
            </div>
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
            <Button type="submit" disabled={isPending} className="rounded-full px-5">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAccountDialog({
  account,
  onOpenChange,
}: {
  account: AccountWithBalance | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const linked = account?.transactionCount ?? 0;

  function handleDelete() {
    if (!account) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(account.id);
      if (!result.ok) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog
      open={account !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{account?.name}”?</DialogTitle>
          <DialogDescription>
            {linked > 0
              ? `This account is linked to ${linked} transaction${
                  linked === 1 ? "" : "s"
                }. They'll be kept but become unlinked (their account is cleared).`
              : "This account isn't linked to any transactions."}
          </DialogDescription>
        </DialogHeader>

        {linked > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Heads up: {linked} transaction{linked === 1 ? "" : "s"} will lose this
            account.
          </div>
        )}

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
            className="rounded-full px-5"
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
