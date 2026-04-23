"use client";

import { formatTzs } from "@/lib/currency";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CardPayload } from "@/lib/assistant/tools";

type PlanCardProps = Extract<CardPayload, { kind: "plan" }>;

export function PlanCard(props: PlanCardProps) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.assistant;

  const rows: { label: string; value: string }[] = [
    { label: t.cardDeposit, value: formatTzs(props.deposit, locale) },
    {
      label: t.cardMonthly,
      value: `${formatTzs(props.monthly, locale)} × ${props.term}`,
    },
    { label: t.cardTotal, value: formatTzs(props.totalPayable, locale) },
    { label: t.cardApr, value: `${Math.round(props.apr * 100)}%` },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {formatTzs(props.priceTzs, locale)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {row.label}
            </dt>
            <dd className="text-[13px] font-semibold tracking-tight">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
