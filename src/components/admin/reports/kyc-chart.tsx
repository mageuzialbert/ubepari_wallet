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

import { formatDate } from "@/lib/datetime";
import type { Locale } from "@/i18n/config";

type Labels = {
  approved: string;
  rejected: string;
  pending: string;
};

export type KycChartDatum = {
  weekStart: string;
  approved: number;
  rejected: number;
  pending: number;
};

export function KycChart({
  data,
  labels,
  locale,
}: {
  data: KycChartDatum[];
  labels: Labels;
  locale: Locale;
}) {
  if (data.length === 0) return null;
  const axisWeek = (v: string) =>
    formatDate(v, locale, { day: "2-digit", month: "short" });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="weekStart"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={axisWeek}
            axisLine={false}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
            itemStyle={{ color: "var(--foreground)" }}
            labelFormatter={(l) =>
              formatDate(String(l), locale, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            }
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
            dataKey="approved"
            name={labels.approved}
            stackId="state"
            fill="var(--chart-approved, #34c38f)"
          />
          <Bar
            dataKey="rejected"
            name={labels.rejected}
            stackId="state"
            fill="var(--chart-rejected, #e8717b)"
          />
          <Bar
            dataKey="pending"
            name={labels.pending}
            stackId="state"
            fill="var(--chart-pending, #e7c35b)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
