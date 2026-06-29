"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { MAX_NAME_LENGTH } from "@/lib/validation";

// Budget limits are managed only on the /budgets page (see src/lib/budgets.ts),
// so category create/edit never touches the Budget rows.

export const createCategory = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const name = String(formData.get("name") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim() || null;
    const icon = String(formData.get("icon") ?? "").trim() || null;

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

    await prisma.category.create({
      data: { userId, name, color, icon, isDefault: false },
    });

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
