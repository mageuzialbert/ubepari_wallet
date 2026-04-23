"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CardPayload } from "@/lib/assistant/tools";

type Props = Extract<CardPayload, { kind: "goal" }>;

export function GoalCard(props: Props) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.goals;

  const progressPct =
    props.priceTzs > 0
      ? Math.min(100, Math.round((props.contributedTzs / props.priceTzs) * 100))
      : 0;
  const statusLabel =
    t.statusLabel[props.status as keyof typeof t.statusLabel] ?? props.status;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {props.reference}
          </p>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight">
            {props.productName}
          </h3>
        </div>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {statusLabel}
        </span>
      </div>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatTzs(props.contributedTzs, locale)} /{" "}
          {formatTzs(props.priceTzs, locale)} · {progressPct}%
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[12px] text-muted-foreground">
          {props.nextReminderDate ? (
            <>
              <span className="uppercase tracking-wider text-[10px]">
                {t.nextReminder}
              </span>
              <p className="text-[12px] text-foreground">
                {formatDate(props.nextReminderDate, locale)} ·{" "}
                {formatTzs(props.monthlyTargetTzs, locale)}
              </p>
            </>
          ) : null}
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-7 rounded-full px-3 text-[11px]"
        >
          <Link href={`/${locale}/account/goals/${props.id}`}>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
