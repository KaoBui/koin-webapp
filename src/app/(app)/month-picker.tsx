"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatMonthLabel, shiftMonth } from "@/lib/format";

/**
 * Global month selector for the dashboard. Drives the whole page via a
 * `?month=YYYY-MM` search param (URL state) rather than local state, so the
 * server component can recompute every widget for the chosen month.
 */
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const go = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("month", next);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-1 shadow-sm">
      <button
        type="button"
        onClick={() => go(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.()}
        className="relative min-w-[8.5rem] rounded-sm px-2 py-0.5 text-center text-sm font-medium transition-colors hover:bg-accent"
      >
        {formatMonthLabel(month)}
        <input
          ref={inputRef}
          type="month"
          value={month}
          onChange={(e) => e.target.value && go(e.target.value)}
          aria-label="Pick month"
          className="sr-only absolute inset-0"
          tabIndex={-1}
        />
      </button>

      <button
        type="button"
        onClick={() => go(shiftMonth(month, 1))}
        aria-label="Next month"
        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
