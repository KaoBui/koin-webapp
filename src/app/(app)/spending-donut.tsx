"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { currentMonthKey, eur, formatMonthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DonutDatum } from "./dashboard-types";

export function SpendingDonut({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatMonthLabel(currentMonthKey())}
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No expenses this month.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => eur.format(Number(value))} />
              </PieChart>
            </ResponsiveContainer>

            <ul className="mt-4 space-y-1.5">
              {data.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {eur.format(d.value)}
                    {total > 0 && (
                      <span className="text-muted-foreground/60">
                        {" "}
                        ({Math.round((d.value / total) * 100)}%)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
