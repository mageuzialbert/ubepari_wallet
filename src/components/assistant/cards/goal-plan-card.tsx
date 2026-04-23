"use client";

import { formatTzs } from "@/lib/currency";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CardPayload } from "@/lib/assistant/tools";

type Props = Extract<CardPayload, { kind: "goalPlan" }>;

export function GoalPlanCard(props: Props) {
  const locale = useLocale();
  const t = useDictionary().goal;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {formatTzs(props.priceTzs, locale)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex flex-col">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t.rows.monthlyTarget}
          </dt>
          <dd className="text-[13px] font-semibold tracking-tight">
            {formatTzs(props.monthlyTarget, locale)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t.rows.term}
          </dt>
          <dd className="text-[13px] font-semibold tracking-tight">
            {props.term} {t.monthsSuffix}
          </dd>
        </div>
      </dl>
    </div>
  );
}
