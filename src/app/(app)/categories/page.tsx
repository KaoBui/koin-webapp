import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories } from "@/lib/categories";

import { CategoryManager, type CategoryItem } from "./category-manager";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Safety net: if this user somehow has no categories yet, seed the defaults.
  await ensureDefaultCategories(userId);

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      budgets: { where: { period: "MONTHLY" }, take: 1 },
      _count: { select: { transactions: true } },
    },
  });

  const items: CategoryItem[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    isDefault: category.isDefault,
    monthlyLimit: category.budgets[0]
      ? category.budgets[0].limitAmount.toNumber()
      : null,
    transactionCount: category._count.transactions,
  }));

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10">
      <CategoryManager categories={items} />
    </div>
  );
}
