"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { type TransactionTypeValue } from "@/lib/transaction-constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/validation";
import {
  parseAmount,
  parseTransactionDate,
  isTransactionType,
  normalizeDescription,
} from "@/lib/transactions";

type ParsedFields =
  | {
      ok: true;
      amount: number;
      type: TransactionTypeValue;
      date: Date;
      description: string | null;
      categoryId: string | null;
      accountId: string | null;
    }
  | { ok: false; error: string; field?: string };

async function parseAndValidate(
  userId: string,
  formData: FormData,
): Promise<ParsedFields> {
  const amount = parseAmount(formData.get("amount"));
  const typeRaw = String(formData.get("type") ?? "");
  const date = parseTransactionDate(formData.get("date"));
  const description = normalizeDescription(formData.get("description"));
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const accountId = String(formData.get("accountId") ?? "").trim() || null;

  if (amount == null) {
    return { ok: false, error: "Enter an amount greater than 0.", field: "amount" };
  }
  if (!isTransactionType(typeRaw)) {
    return { ok: false, error: "Choose income or expense.", field: "type" };
  }
  if (!date) return { ok: false, error: "Enter a valid date.", field: "date" };
  if (descriptionRaw.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
      field: "description",
    };
  }

  if (categoryId) {
    const owned = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!owned) {
      return { ok: false, error: "Selected category was not found.", field: "categoryId" };
    }
  }
  if (accountId) {
    const owned = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!owned) {
      return { ok: false, error: "Selected account was not found.", field: "accountId" };
    }
  }

  return { ok: true, amount, type: typeRaw, date, description, categoryId, accountId };
}

export const createTransaction = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const parsed = await parseAndValidate(userId, formData);
    if (!parsed.ok) return parsed;

    await prisma.transaction.create({
      data: {
        userId,
        amount: parsed.amount,
        type: parsed.type,
        date: parsed.date,
        description: parsed.description,
        categoryId: parsed.categoryId,
        accountId: parsed.accountId,
        importSource: "manual",
      },
    });

    revalidateFinance();
    return { ok: true };
  },
);

export const updateTransaction = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing transaction id." };

    const owned = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) return { ok: false, error: "Transaction not found." };

    const parsed = await parseAndValidate(userId, formData);
    if (!parsed.ok) return parsed;

    // Note: importSource is intentionally left untouched on edit.
    await prisma.transaction.update({
      where: { id },
      data: {
        amount: parsed.amount,
        type: parsed.type,
        date: parsed.date,
        description: parsed.description,
        categoryId: parsed.categoryId,
        accountId: parsed.accountId,
      },
    });

    revalidateFinance();
    return { ok: true };
  },
);

export const deleteTransaction = action(
  async (userId, id: string): Promise<ActionResult> => {
    const { count } = await prisma.transaction.deleteMany({
      where: { id, userId },
    });
    if (count === 0) return { ok: false, error: "Transaction not found." };

    revalidateFinance();
    return { ok: true };
  },
);
