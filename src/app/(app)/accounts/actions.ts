"use server";

import { action, revalidateFinance, type ActionResult } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_TYPES, type AccountTypeValue } from "@/lib/account-constants";
import { MAX_NAME_LENGTH } from "@/lib/validation";

function parseBalance(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (value === "") return 0; // empty opening balance = 0
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

type ParsedFields =
  | {
      ok: true;
      name: string;
      type: AccountTypeValue;
      balance: number;
      currency: string;
      isDefault: boolean;
    }
  | { ok: false; error: string; field?: string };

function parseAndValidate(formData: FormData): ParsedFields {
  const name = String(formData.get("name") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const balance = parseBalance(formData.get("balance"));
  let currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  if (!currency) currency = "EUR";
  const isDefault = formData.get("isDefault") != null;

  if (!name) return { ok: false, error: "Name is required.", field: "name" };
  if (name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      field: "name",
    };
  }
  if (!ACCOUNT_TYPES.includes(typeRaw as AccountTypeValue)) {
    return { ok: false, error: "Choose a valid account type.", field: "type" };
  }
  if (balance == null) {
    return { ok: false, error: "Enter a valid balance.", field: "balance" };
  }

  return {
    ok: true,
    name,
    type: typeRaw as AccountTypeValue,
    balance,
    currency,
    isDefault,
  };
}

export const createAccount = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const parsed = parseAndValidate(formData);
    if (!parsed.ok) return parsed;

    // The user's first account is always the default; otherwise honour the
    // checkbox. There is only ever one default per user (enforced below).
    const existingCount = await prisma.financialAccount.count({ where: { userId } });
    const isDefault = parsed.isDefault || existingCount === 0;

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.financialAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      await tx.financialAccount.create({
        data: {
          userId,
          name: parsed.name,
          type: parsed.type,
          balance: parsed.balance,
          currency: parsed.currency,
          isDefault,
        },
      });
    });

    revalidateFinance();
    return { ok: true };
  },
);

export const updateAccount = action(
  async (userId, formData: FormData): Promise<ActionResult> => {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false, error: "Missing account id." };

    const owned = await prisma.financialAccount.findFirst({
      where: { id, userId },
      select: { id: true, isDefault: true },
    });
    if (!owned) return { ok: false, error: "Account not found." };

    const parsed = parseAndValidate(formData);
    if (!parsed.ok) return parsed;

    // You promote a default by checking another account, never by un-checking the
    // current one, so the default account stays default even if the box is off.
    const isDefault = parsed.isDefault || owned.isDefault;

    await prisma.$transaction(async (tx) => {
      if (isDefault && !owned.isDefault) {
        await tx.financialAccount.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      await tx.financialAccount.update({
        where: { id },
        data: {
          name: parsed.name,
          type: parsed.type,
          balance: parsed.balance,
          currency: parsed.currency,
          isDefault,
        },
      });
    });

    revalidateFinance();
    return { ok: true };
  },
);

export const deleteAccount = action(
  async (userId, id: string): Promise<ActionResult> => {
    const owned = await prisma.financialAccount.findFirst({
      where: { id, userId },
      select: { id: true, isDefault: true },
    });
    if (!owned) return { ok: false, error: "Account not found." };

    await prisma.$transaction(async (tx) => {
      // Transactions keep accountId = null (onDelete: SetNull in the schema).
      await tx.financialAccount.delete({ where: { id } });

      // If we removed the default, promote the oldest remaining account so a
      // default always exists while the user has any accounts.
      if (owned.isDefault) {
        const next = await tx.financialAccount.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (next) {
          await tx.financialAccount.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    revalidateFinance();
    return { ok: true };
  },
);
