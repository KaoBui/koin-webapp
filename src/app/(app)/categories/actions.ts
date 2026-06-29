"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { MAX_NAME_LENGTH } from "@/lib/validation";

function parseLimit(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// Keep the category's single MONTHLY budget in sync with the form's limit:
// create it, update it, or remove it when the limit is cleared / zero.
async function syncMonthlyBudget(
  userId: string,
  categoryId: string,
  limit: number | null,
) {
  const existing = await prisma.budget.findFirst({
    where: { userId, categoryId, period: "MONTHLY" },
  });

  if (limit == null || limit === 0) {
    if (existing) await prisma.budget.delete({ where: { id: existing.id } });
    return;
  }

  if (existing) {
    await prisma.budget.update({
      where: { id: existing.id },
      data: { limitAmount: limit },
    });
  } else {
    await prisma.budget.create({
      data: {
        userId,
        categoryId,
        limitAmount: limit,
        period: "MONTHLY",
        startDate: new Date(),
      },
    });
  }
}

export const createCategory = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const name = String(formData.get("name") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim() || null;
    const icon = String(formData.get("icon") ?? "").trim() || null;
    const limit = parseLimit(formData.get("monthlyLimit"));

    if (!name) return { ok: false, error: "Name is required.", field: "name" };
    if (name.length > MAX_NAME_LENGTH) {
      return {
        ok: false,
        error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
        field: "name",
      };
    }

    const duplicate = await prisma.category.findFirst({
      where: { userId, name },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "A category with that name already exists.",
        field: "name",
      };
    }

    const category = await prisma.category.create({
      data: { userId, name, color, icon, isDefault: false },
    });
    await syncMonthlyBudget(userId, category.id, limit);

    revalidateFinance();
    return { ok: true };
  },
);

export const updateCategory = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim() || null;
    const icon = String(formData.get("icon") ?? "").trim() || null;
    const limit = parseLimit(formData.get("monthlyLimit"));

    if (!id) return { ok: false, error: "Missing category id." };
    if (!name) return { ok: false, error: "Name is required.", field: "name" };
    if (name.length > MAX_NAME_LENGTH) {
      return {
        ok: false,
        error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
        field: "name",
      };
    }

    // Ownership check — scope strictly to the signed-in user.
    const owned = await prisma.category.findFirst({ where: { id, userId } });
    if (!owned) return { ok: false, error: "Category not found." };

    const duplicate = await prisma.category.findFirst({
      where: { userId, name, NOT: { id } },
    });
    if (duplicate) {
      return {
        ok: false,
        error: "A category with that name already exists.",
        field: "name",
      };
    }

    await prisma.category.update({
      where: { id },
      data: { name, color, icon },
    });
    await syncMonthlyBudget(userId, id, limit);

    revalidateFinance();
    return { ok: true };
  },
);

export const deleteCategory = action(
  async (userId, id: string): Promise<ActionResult> => {
    // Transactions keep categoryId = null (onDelete: SetNull in the schema);
    // any budgets for this category are removed (onDelete: Cascade).
    const { count } = await prisma.category.deleteMany({
      where: { id, userId },
    });
    if (count === 0) return { ok: false, error: "Category not found." };

    revalidateFinance();
    return { ok: true };
  },
);
