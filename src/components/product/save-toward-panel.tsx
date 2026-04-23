"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";

import { StartGoalDialog } from "@/components/product/start-goal-dialog";
import { Button } from "@/components/ui/button";
import { formatTzs } from "@/lib/currency";
import {
  computeMonthlyTarget,
  GOAL_TERMS,
  type GoalTerm,
} from "@/lib/goal";
import { useDictionary, useLocale } from "@/i18n/provider";

export function SaveTowardPanel({
  price,
  productSlug,
  productName,
}: {
  price: number;
  productSlug: string;
  productName: string;
}) {
  const [term, setTerm] = React.useState<GoalTerm>(12);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const monthlyTarget = React.useMemo(
    () => computeMonthlyTarget(price, term),
    [price, term],
  );
  const locale = useLocale();
  const t = useDictionary().goal;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t.planLabel}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={monthlyTarget}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            {formatTzs(monthlyTarget, locale)}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm text-muted-foreground">{t.perMonthSuffix}</span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>{t.chooseDuration}</span>
          <span className="font-mono text-foreground">{term} {t.monthsSuffix}</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {GOAL_TERMS.map((n) => (
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
        <Row label={t.rows.price} value={formatTzs(price, locale)} />
        <Row
          label={t.rows.monthlyTarget}
          value={formatTzs(monthlyTarget, locale)}
        />
        <Row
          label={t.rows.term}
          value={`${term} ${t.monthsSuffix}`}
          emphasize
        />
      </dl>

      <Button
        size="lg"
        className="mt-6 w-full rounded-full"
        onClick={() => setDialogOpen(true)}
      >
        {t.startGoalButton}
      </Button>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {t.disclaimer}
      </p>

      <StartGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productSlug={productSlug}
        productName={productName}
        termMonths={term}
        monthlyTarget={monthlyTarget}
      />
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
