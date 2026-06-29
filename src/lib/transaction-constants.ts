// Shared, client-safe transaction constants (imported by both the form UI and
// the server actions), mirroring the account-constants pattern.
//
// Note: the Prisma `TransactionType` enum also defines `TRANSFER`, which is
// reserved for a future account-to-account transfer feature and is NOT yet
// accepted by the UI or the actions. `TRANSACTION_TYPES` below is the single
// source of truth for what the app currently supports — keep validators keyed
// off it so the supported set never drifts across files.

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;

export type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeValue, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
};
