"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { formatTzs } from "@/lib/currency";
import {
  CREDIT_TERMS,
  computeCreditPlan,
  type CreditTerm,
} from "@/lib/credit";
import { useDictionary, useLocale } from "@/i18n/provider";

export function CreditCalculator({ price }: { price: number }) {
  const [term, setTerm] = React.useState<CreditTerm>(12);
  const plan = React.useMemo(() => computeCreditPlan(price, term), [price, term]);
  const locale = useLocale();
  const t = useDictionary().credit;

  const reserveLabel = t.reserveButton.replace(
    "{amount}",
    formatTzs(plan.deposit, locale),
  );

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.planLabel}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={plan.monthly}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="text-4xl font-semibold tracking-tight sm:text-5xl"
              >
                {formatTzs(plan.monthly, locale)}
              </motion.span>
            </AnimatePresence>
            <span className="text-sm text-muted-foreground">{t.perMonthSuffix}</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>{t.chooseDuration}</span>
          <span className="font-mono text-foreground">{term} {t.monthsSuffix}</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {CREDIT_TERMS.map((n) => (
            <button
              key={n}
              onClick={() => setTerm(n)}
              className={`rounded-full border py-2 text-[12px] font-medium transition-all ${
                term === n
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {n} {t.termSuffix}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-6 divide-y divide-border/60 rounded-2xl bg-background/60">
        <Row label={t.rows.cashPrice} value={formatTzs(plan.price, locale)} />
        <Row label={t.rows.deposit} value={formatTzs(plan.deposit, locale)} />
        <Row label={t.rows.financed} value={formatTzs(plan.financed, locale)} />
        <Row
          label={t.rows.serviceFee}
          value={plan.apr === 0 ? t.rows.free : `${(plan.apr * 100).toFixed(0)}%`}
        />
        <Row
          label={t.rows.total}
          value={formatTzs(plan.totalPayable, locale)}
          emphasize
        />
      </dl>

      <div className="mt-6 flex flex-col gap-2">
        <Button size="lg" className="rounded-full">
          {reserveLabel}
        </Button>
        <Button size="lg" variant="outline" className="rounded-full">
          {t.savePlan}
        </Button>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {t.disclaimer}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasize
            ? "font-semibold tracking-tight text-foreground"
            : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
