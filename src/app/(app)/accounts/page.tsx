import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAccountsWithBalances } from "@/lib/accounts";

import { AccountManager } from "./account-manager";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const accounts = await getAccountsWithBalances(session.user.id);

  return (
    <div className="p-6 lg:p-8">
      <AccountManager accounts={accounts} />
    </div>
  );
}
