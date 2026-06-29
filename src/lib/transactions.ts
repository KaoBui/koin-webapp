// Pure, shared transaction field parsers used by both the manual-entry actions
// (transactions/actions.ts) and the AI-import action (import/actions.ts) so the
// two paths can never diverge in how they interpret amounts, dates and types.

import {
  TRANSACTION_TYPES,
  type TransactionTypeValue,
} from "@/lib/transaction-constants";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/validation";

/** Parse a positive money amount, rounded to 2 decimals, or null if invalid. */
export function parseAmount(raw: unknown): number | null {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  // Always store a positive amount; direction comes from `type`.
  return Math.round(Math.abs(n) * 100) / 100;
}

/** Parse a `YYYY-MM-DD` string into a UTC midnight Date, or null if invalid. */
export function parseTransactionDate(raw: unknown): Date | null {
  const value = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Type guard for the transaction types the app currently supports. */
export function isTransactionType(value: unknown): value is TransactionTypeValue {
  return (TRANSACTION_TYPES as readonly unknown[]).includes(value);
}

/** Trim a description to null-or-capped text. */
export function normalizeDescription(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return value.slice(0, MAX_DESCRIPTION_LENGTH);
}
