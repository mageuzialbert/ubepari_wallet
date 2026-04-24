"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Smartphone, Wallet } from "lucide-react";

import { AllocateDialog } from "@/components/wallet/allocate-dialog";
import { ContributeDialog } from "@/components/goals/contribute-dialog";
import { VestedPhoto } from "@/components/goals/vested-photo";
import { Button } from "@/components/ui/button";
import { formatTzs } from "@/lib/currency";
import { ownershipCopy, pushesRemaining } from "@/lib/goal-copy";
import { CARD_SPRING, useReducedMotion } from "@/lib/motion";
import { useDictionary, useLocale } from "@/i18n/provider";

export type ActiveGoalCardProps = {
  goalId: string;
  reference: string;
  productName: string;
  productImage: string | undefined;
  productColorAccent: string | null | undefined;
  productPriceTzs: number;
  contributedTzs: number;
  monthlyTargetTzs: number;
  availableTzs: number;
};

export function ActiveGoalCard(props: ActiveGoalCardProps) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.goals;
  const wt = dict.wallet;
  const reduced = useReducedMotion();
  const [contribOpen, setContribOpen] = React.useState(false);
  const [allocOpen, setAllocOpen] = React.useState(false);

  const percent = Math.min(
    100,
    Math.round((props.contributedTzs / props.productPriceTzs) * 100),
  );
  const remaining = Math.max(0, props.productPriceTzs - props.contributedTzs);
  const suggestedAmount = Math.min(
    props.monthlyTargetTzs,
    remaining || props.monthlyTargetTzs,
  );
  const canAllocate = props.availableTzs > 0 && remaining > 0;

  const pushes = pushesRemaining(remaining, props.monthlyTargetTzs);
  const copy = ownershipCopy(percent, pushes);
  const ownershipLine = resolveOwnership(copy, t.ownership);

  const motionProps = reduced
    ? {}
    : {
        whileHover: { y: -2 },
        whileTap: { scale: 0.98 },
        transition: CARD_SPRING,
      };

  return (
    <motion.div
      {...motionProps}
      className="group overflow-hidden rounded-3xl border border-border/60 bg-card"
    >
      <Link
        href={`/${locale}/account/goals/${props.goalId}`}
        className="block"
      >
        <VestedPhoto
          imageUrl={props.productImage}
          alt={props.productName}
          percent={percent}
          colorAccent={props.productColorAccent}
          aspect="5/3"
        >
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                {props.reference}
              </p>
              <p className="mt-1 truncate text-[17px] font-semibold tracking-tight">
                {props.productName}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tabular-nums backdrop-blur-md">
              {percent}%
            </span>
          </div>
        </VestedPhoto>
      </Link>

      <div className="p-5">
        <p className="text-[13px] text-muted-foreground tabular-nums">
          {formatTzs(props.contributedTzs, locale)}{" "}
          <span className="text-muted-foreground/60">
            / {formatTzs(props.productPriceTzs, locale)}
          </span>
        </p>
        <p className="mt-1 text-[15px] font-medium tracking-tight">
          {ownershipLine}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => setContribOpen(true)}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {t.contributeCta}
          </Button>
          {canAllocate && (
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => setAllocOpen(true)}
            >
              <Wallet className="h-3.5 w-3.5" />
              {wt.allocateShort}
            </Button>
          )}
        </div>
      </div>

      <ContributeDialog
        open={contribOpen}
        onOpenChange={setContribOpen}
        goalId={props.goalId}
        productName={props.productName}
        suggestedAmount={suggestedAmount}
      />

      <AllocateDialog
        open={allocOpen}
        onOpenChange={setAllocOpen}
        availableTzs={props.availableTzs}
        goals={[
          {
            id: props.goalId,
            reference: props.reference,
            productName: props.productName,
            remainingTzs: remaining,
          },
        ]}
        defaultGoalId={props.goalId}
      />
    </motion.div>
  );
}

function resolveOwnership(
  copy: ReturnType<typeof ownershipCopy>,
  dict: {
    justStarted: string;
    pushesLeft: string;
    pushesLeftOne: string;
    almostThere: string;
    itsYours: string;
  },
): string {
  switch (copy.key) {
    case "itsYours":
      return dict.itsYours;
    case "almostThere":
      return dict.almostThere;
    case "pushesLeftOne":
      return dict.pushesLeftOne;
    case "pushesLeft":
      return dict.pushesLeft.replace("{count}", String(copy.count ?? 0));
    case "justStarted":
    default:
      return dict.justStarted;
  }
}
