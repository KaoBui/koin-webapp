// Client-safe formatting + month helpers (no server imports), shared across the
// dashboard widgets and pages.

export const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const monthLabelFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortMonthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(Date.UTC(y, m - 1 + delta, 1)));
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
}

export function formatMonthLabel(month: string): string {
  return monthLabelFmt.format(new Date(`${month}-01T00:00:00.000Z`));
}

export function formatShortMonth(d: Date): string {
  return shortMonthFmt.format(d);
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00.000Z`));
}
