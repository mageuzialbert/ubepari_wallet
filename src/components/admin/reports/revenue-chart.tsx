"use client";

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

import { formatTzs, formatTzsCompact } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import type { Locale } from "@/i18n/config";

type Labels = {
  deposit: string;
  installment: string;
  topup: string;
  total: string;
};

export type RevenueChartDatum = {
  dateKey: string;
  deposit: number;
  installment: number;
  topup: number;
  total: number;
};

export function RevenueChart({
  data,
  labels,
  locale,
}: {
  data: RevenueChartDatum[];
  labels: Labels;
  locale: Locale;
}) {
  if (data.length === 0) return null;
  const axisDate = (v: string) =>
    formatDate(v, locale, { day: "2-digit", month: "short" });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap={4}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="dateKey"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={axisDate}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(n: number) => formatTzsCompact(n)}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{
              color: "var(--foreground)",
              fontWeight: 500,
            }}
            itemStyle={{ color: "var(--foreground)" }}
            labelFormatter={(l) =>
              formatDate(String(l), locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            }
            formatter={(v) => formatTzs(Number(v) || 0, locale)}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              paddingTop: 8,
            }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="deposit"
            name={labels.deposit}
            stackId="kind"
            fill="var(--chart-1, #4f8cff)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="installment"
            name={labels.installment}
            stackId="kind"
            fill="var(--chart-2, #8bb8ff)"
          />
          <Bar
            dataKey="topup"
            name={labels.topup}
            stackId="kind"
            fill="var(--chart-3, #cfe0ff)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
