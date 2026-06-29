// Serializable data shapes passed from the dashboard page (server) to the
// client widgets. Plain types only — safe to import on both sides.

export type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

export type TxMini = {
  date: string; // yyyy-mm-dd (UTC)
  amount: number;
  type: TxType;
  categoryId: string | null;
};

export type BarDatum = {
  month: string; // yyyy-mm
  label: string;
  income: number;
  expense: number;
};

export type DonutDatum = {
  name: string;
  color: string;
  value: number;
};

export type BudgetItem = {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  limit: number;
};

export type RecentTx = {
  id: string;
  date: string; // yyyy-mm-dd (UTC)
  description: string | null;
  amount: number;
  type: TxType;
  categoryName: string | null;
  categoryColor: string | null;
};
