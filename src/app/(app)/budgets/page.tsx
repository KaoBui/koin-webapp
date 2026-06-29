import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ensureDefaultCategories } from "@/lib/categories";
import { getBudgetData } from "@/lib/budgets";
import { currentMonthKey } from "@/lib/format";

import { BudgetManager } from "./budget-manager";

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Safety net: if this user somehow has no categories yet, seed the defaults.
  await ensureDefaultCategories(userId);

  const month = currentMonthKey();
  const { rows, income } = await getBudgetData(userId, month);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <BudgetManager
        initialMonth={month}
        initialRows={rows}
        initialIncome={income}
      />
    </div>
  );
}
