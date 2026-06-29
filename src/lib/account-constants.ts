// Shared, client-safe account-type constants (imported by both the form UI and
// the server actions).

export const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "CREDIT", "CASH"] as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT: "Credit",
  CASH: "Cash",
};
