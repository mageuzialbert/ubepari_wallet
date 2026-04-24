"use client";

import * as React from "react";
import Link from "next/link";
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { formatTzs } from "@/lib/currency";
import { REVEAL_SPRING, useReducedMotion } from "@/lib/motion";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { WalletBalance } from "@/lib/wallet";

const COUNT_UP_MS = 520;

export function BalanceCard({
  balance,
  locale,
  dict,
}: {
  balance: WalletBalance;
  locale: Locale;
  dict: Dictionary["wallet"];
}) {
  const reduced = useReducedMotion();
  const availableShare =
    balance.totalTzs > 0
      ? Math.min(100, (balance.availableTzs / balance.totalTzs) * 100)
      : 0;

  return (
    <div className="rounded-[28px] border border-border/60 bg-card p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {dict.total}
      </p>
      <CountUpAmount value={balance.totalTzs} locale={locale} reduced={reduced} />

      {balance.totalTzs > 0 && (
        <SplitBar
          availableShare={availableShare}
          reduced={reduced}
          availableLabel={dict.available}
          allocatedLabel={dict.allocated}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Bucket
          label={dict.available}
          amount={balance.availableTzs}
          locale={locale}
          emphasis
        />
        <AllocatedBucket
          label={dict.allocated}
          amount={balance.allocatedTzs}
          locale={locale}
        />
      </div>
    </div>
  );
}

function CountUpAmount({
  value,
  locale,
  reduced,
}: {
  value: number;
  locale: Locale;
  reduced: boolean;
}) {
  const mv = useMotionValue(reduced ? value : 0);
  const [display, setDisplay] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (reduced) {
      mv.set(value);
      setDisplay(value);
      return;
    }
    const controls = animate(mv, value, {
      duration: COUNT_UP_MS / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduced, mv]);

  return (
    <p className="mt-3 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
      {formatTzs(Math.round(display), locale)}
    </p>
  );
}

function SplitBar({
  availableShare,
  reduced,
  availableLabel,
  allocatedLabel,
}: {
  availableShare: number;
  reduced: boolean;
  availableLabel: string;
  allocatedLabel: string;
}) {
  const target = useMotionValue(0);
  const spring = useSpring(target, REVEAL_SPRING);
  const widthPct = useTransform(spring, (v) => `${v}%`);

  React.useEffect(() => {
    target.set(availableShare);
  }, [availableShare, target]);

  const style = reduced
    ? { width: `${availableShare}%` }
    : { width: widthPct };

  return (
    <div className="mt-6">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-foreground/15">
        <motion.div
          className="h-full rounded-full bg-foreground"
          style={style}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span>{availableLabel}</span>
        <span>{allocatedLabel}</span>
      </div>
    </div>
  );
}

function Bucket({
  label,
  amount,
  locale,
  emphasis,
}: {
  label: string;
  amount: number;
  locale: Locale;
  emphasis: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "rounded-2xl border border-border/60 bg-background/40 p-4 ring-1 ring-foreground/10"
          : "rounded-2xl border border-dashed border-border/60 p-4"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {formatTzs(amount, locale)}
      </p>
    </div>
  );
}

function AllocatedBucket({
  label,
  amount,
  locale,
}: {
  label: string;
  amount: number;
  locale: Locale;
}) {
  // Link inherits the button behavior — tapping it takes the user to where the
  // money is parked (their goals list). On desktop the entire block is still
  // clickable, which is good enough for the "trust me my money is real" feel.
  return (
    <Link
      href="/account/goals"
      className="block rounded-2xl border border-dashed border-border/60 p-4 transition-colors hover:border-border"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {formatTzs(amount, locale)}
      </p>
    </Link>
  );
}
