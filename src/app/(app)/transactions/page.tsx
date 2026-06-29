import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { TransactionManager, type TransactionItem } from "./transaction-manager";

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 1)),
  };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { month?: string; category?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const month = /^\d{4}-\d{2}$/.test(searchParams.month ?? "")
    ? (searchParams.month as string)
    : currentMonth();
  const category = searchParams.category ?? "";
  const { start, end } = monthRange(month);

  // Build the category filter: "" = all, "none" = uncategorised, else the id.
  const categoryWhere =
    category === "none"
      ? { categoryId: null }
      : category
        ? { categoryId: category }
        : {};

  const [categories, accounts, transactions] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.financialAccount.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isDefault: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end }, ...categoryWhere },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        category: { select: { name: true, color: true } },
        account: { select: { name: true } },
      },
    }),
  ]);

  const items: TransactionItem[] = transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    description: t.description,
    amount: t.amount.toNumber(),
    type: t.type,
    importSource: t.importSource,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
    accountId: t.accountId,
    accountName: t.account?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <TransactionManager
        transactions={items}
        categories={categories}
        accounts={accounts}
        month={month}
        category={category}
      />
    </div>
  );
}
