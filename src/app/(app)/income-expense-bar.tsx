"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { eur } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BarDatum } from "./dashboard-types";

type Span = "6m" | "ytd" | "1y";

const SPANS: { key: Span; label: string }[] = [
  { key: "6m", label: "6 months" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1 year" },
];

export function IncomeExpenseBar({ series }: { series: BarDatum[] }) {
  const [span, setSpan] = React.useState<Span>("6m");

  const data = React.useMemo(() => {
    if (span === "6m") return series.slice(-6);
    if (span === "1y") return series;
    const year = String(new Date().getUTCFullYear());
    return series.filter((d) => d.month.startsWith(year));
  }, [span, series]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Income vs Expenses</CardTitle>
        <div className="flex gap-1">
          {SPANS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSpan(s.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                span === s.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e6e6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip
              formatter={(value) => eur.format(Number(value))}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#1aae39" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="#dd5b00" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
