"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { connectBank, syncBank } from "./bank-actions";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export type BankOption = { name: string; country: string };

export function SyncBankButton() {
  const router = useRouter();
  const [status, setStatus] = React.useState<string | null>(null);
  const [staged, setStaged] = React.useState(0);
  const [isPending, startTransition] = React.useTransition();

  function handleSync() {
    setStatus(null);
    setStaged(0);
    startTransition(async () => {
      const result = await syncBank();
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      const { inserted, errors } = result.data;
      let msg =
        inserted === 0
          ? "No new transactions."
          : `${inserted} new transaction${inserted === 1 ? "" : "s"} ready to review.`;
      if (errors.length > 0) msg += ` (Couldn't reach: ${errors.join(", ")}.)`;
      setStatus(msg);
      setStaged(inserted);
      // Refresh so the sidebar "Review" badge updates.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={isPending}
        variant="outline"
        className="rounded-full px-5"
      >
        {isPending ? "Syncing…" : "Sync transactions"}
      </Button>
      {status && <span className="text-sm text-muted-foreground">{status}</span>}
      {staged > 0 && (
        <Link
          href="/review"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          Review now →
        </Link>
      )}
    </div>
  );
}

export function ConnectBank({ banks }: { banks: BankOption[] }) {
  const [value, setValue] = React.useState(
    banks[0] ? `${banks[0].name}|${banks[0].country}` : "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleConnect() {
    const [name, country] = value.split("|");
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const result = await connectBank({ aspspName: name, aspspCountry: country });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Send the user to their bank to authorize. The bank redirects back to
      // /api/banking/callback, which links the account(s).
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="rounded-2xl border bg-muted/40 p-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">Connect a bank</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Securely link a bank account to import transactions automatically.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          aria-label="Bank"
          className={selectClass}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending || banks.length === 0}
        >
          {banks.map((b) => (
            <option key={`${b.name}|${b.country}`} value={`${b.name}|${b.country}`}>
              {b.name} ({b.country})
            </option>
          ))}
        </select>
        <Button
          onClick={handleConnect}
          disabled={isPending || banks.length === 0}
          className="rounded-full px-5 sm:w-auto"
        >
          {isPending ? "Connecting…" : "Connect"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
