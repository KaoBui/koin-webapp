import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAccountsWithBalances } from "@/lib/accounts";
import { listAspsps } from "@/lib/enablebanking";
import { prisma } from "@/lib/prisma";

import { AccountManager } from "./account-manager";
import { ConnectBank, SyncBankButton, type BankOption } from "./connect-bank";

// Which country's banks to offer. Defaults to FI so the Enable Banking sandbox
// (which exposes a "Mock ASPSP" test bank in FI) works out of the box.
const BANK_COUNTRY = process.env.ENABLE_BANKING_COUNTRY ?? "FI";

async function loadBanks(): Promise<BankOption[]> {
  try {
    const { aspsps } = await listAspsps(BANK_COUNTRY);
    return aspsps.map((a) => ({ name: a.name, country: a.country }));
  } catch (err) {
    console.error("Failed to load banks:", err);
    return [];
  }
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: { bank_connected?: string; bank_error?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [accounts, banks, connectionCount] = await Promise.all([
    getAccountsWithBalances(session.user.id),
    loadBanks(),
    prisma.bankConnection.count({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10">
      {searchParams.bank_connected && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          Bank connected. Your linked account is ready — sync transactions next.
        </div>
      )}
      {searchParams.bank_error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t connect your bank ({searchParams.bank_error}). Please try
          again.
        </div>
      )}

      <AccountManager accounts={accounts} />

      {connectionCount > 0 && (
        <div className="rounded-2xl border bg-muted/40 p-5">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">
            Linked banks
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Pull the latest transactions from your connected bank
            {connectionCount === 1 ? "" : "s"}.
          </p>
          <SyncBankButton />
        </div>
      )}

      <ConnectBank banks={banks} />
    </div>
  );
}
