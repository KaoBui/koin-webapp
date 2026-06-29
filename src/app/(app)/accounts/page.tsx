import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAccountsWithBalances } from "@/lib/accounts";

import { AccountManager } from "./account-manager";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const accounts = await getAccountsWithBalances(session.user.id);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <AccountManager accounts={accounts} />
    </div>
  );
}
