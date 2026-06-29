"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { currentMonthKey, eur } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSwitcher } from "./month-switcher";
import type { TxMini } from "./dashboard-types";

function buildSeries(transactions: TxMini[], month: string) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const daily = new Array<number>(daysInMonth + 1).fill(0);

  for (const t of transactions) {
    if (!t.date.startsWith(month)) continue;
    const day = Number(t.date.slice(8, 10));
    if (t.type === "INCOME") daily[day] += t.amount;
    else if (t.type === "EXPENSE") daily[day] -= t.amount;
  }

  const result: { day: string; balance: number }[] = [];
  let running = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    running += daily[d];
    result.push({ day: String(d), balance: Math.round(running * 100) / 100 });
  }
  return result;
}

export function BalanceLineChart({
  transactions,
}: {
  transactions: TxMini[];
}) {
  const [month, setMonth] = React.useState(currentMonthKey());
  const data = React.useMemo(
    () => buildSeries(transactions, month),
    [transactions, month],
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Balance over time</CardTitle>
        <MonthSwitcher value={month} onChange={setMonth} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e6e6" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval={4}
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
              labelFormatter={(label) => `Day ${label}`}
            />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#0075de"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
