"use client";

import { formatMonthLabel, shiftMonth } from "@/lib/format";

export function MonthSwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Previous month"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <span className="min-w-[8.5rem] text-center text-sm font-medium">
        {formatMonthLabel(value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Next month"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
