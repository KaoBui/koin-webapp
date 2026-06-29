import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.financialAccount.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isDefault: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <ImportClient categories={categories} accounts={accounts} />
    </div>
  );
}
