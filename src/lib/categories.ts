import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/category-constants";

/**
 * Idempotently ensure a user has the default set of categories. Creates them
 * only if the user currently has none, so it is safe to call on every sign-in
 * and on first page load.
 */
export async function ensureDefaultCategories(userId: string): Promise<void> {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      userId,
      isDefault: true,
    })),
    skipDuplicates: true,
  });
}
