"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { eur } from "@/lib/format";

export type BudgetShare = {
  name: string;
  color: string;
  value: number;
};

export function BudgetDonut({ data }: { data: BudgetShare[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground">
        No budgets set for this month.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => eur.format(Number(value))}
            contentStyle={{ fontSize: "0.75rem" }}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-2 space-y-1 overflow-y-auto text-xs">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
