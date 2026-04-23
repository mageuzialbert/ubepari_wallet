"use client";

import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CardPayload } from "@/lib/assistant/tools";

type Props = Extract<CardPayload, { kind: "contribution" }>;

export function ContributionCard(props: Props) {
  const locale = useLocale();
  const t = useDictionary().goals.statusLabel;
  const statusLabel = t[props.status as keyof typeof t] ?? props.status;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold tracking-tight">
          {formatTzs(props.amountTzs, locale)}
        </p>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {statusLabel}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {formatDate(props.createdAt, locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
