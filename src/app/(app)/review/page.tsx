import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ReviewClient, type PendingRow } from "./review-client";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [pending, categories] = await Promise.all([
    prisma.pendingTransaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      include: { account: { select: { name: true } } },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: PendingRow[] = pending.map((p) => ({
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    description: p.description ?? "",
    amount: p.amount.toNumber(),
    type: p.type === "INCOME" ? "INCOME" : "EXPENSE",
    categoryId: p.categoryId ?? "",
    accountName: p.account.name,
    aspspName: p.aspspName,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <ReviewClient rows={rows} categories={categories} />
    </div>
  );
}
