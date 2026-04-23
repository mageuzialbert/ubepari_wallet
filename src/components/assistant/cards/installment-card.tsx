"use client";

import Link from "next/link";

import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CardPayload } from "@/lib/assistant/tools";

type InstallmentCardProps = Extract<CardPayload, { kind: "installment" }>;

export function InstallmentCard(props: InstallmentCardProps) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.assistant;

  return (
    <Link
      href={`/${locale}/orders/${props.orderId}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:border-border"
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          #{props.sequence}
        </p>
        <p className="mt-0.5 text-[13px] font-medium tracking-tight">
          {formatDate(props.dueDate, locale)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold tracking-tight">
          {formatTzs(props.amountTzs, locale)}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {props.paid ? t.cardPaid : t.cardUnpaid}
        </p>
      </div>
    </Link>
  );
}
