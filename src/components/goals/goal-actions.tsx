"use client";

import * as React from "react";

import { CancelGoalDialog } from "@/components/goals/cancel-goal-dialog";
import { ContributeDialog } from "@/components/goals/contribute-dialog";
import { AllocateDialog } from "@/components/wallet/allocate-dialog";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";

export function GoalActions({
  goalId,
  goalReference,
  productName,
  suggestedAmount,
  remainingTzs,
  availableTzs,
  isActive,
  isCompleted,
  receiptHref,
}: {
  goalId: string;
  goalReference: string;
  productName: string;
  suggestedAmount: number;
  remainingTzs: number;
  availableTzs: number;
  isActive: boolean;
  isCompleted: boolean;
  receiptHref?: string;
}) {
  const dict = useDictionary();
  const t = dict.goals;
  const wt = dict.wallet;
  const [contribOpen, setContribOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [allocOpen, setAllocOpen] = React.useState(false);

  const canAllocate = availableTzs > 0 && remainingTzs > 0;

  return (
    <>
      {isActive && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="lg"
            className="rounded-full"
            onClick={() => setContribOpen(true)}
          >
            {t.contributeCta}
          </Button>
          {canAllocate && (
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full"
              onClick={() => setAllocOpen(true)}
            >
              {wt.allocateShort}
            </Button>
          )}
          <Button
            size="lg"
            variant="ghost"
            className="rounded-full"
            onClick={() => setCancelOpen(true)}
          >
            {t.cancelGoal}
          </Button>
        </div>
      )}

      {isCompleted && receiptHref && (
        <div className="mt-6">
          <Button asChild size="lg" className="rounded-full">
            <a href={receiptHref} target="_blank" rel="noopener">
              {t.downloadReceipt}
            </a>
          </Button>
        </div>
      )}

      <ContributeDialog
        open={contribOpen}
        onOpenChange={setContribOpen}
        goalId={goalId}
        productName={productName}
        suggestedAmount={suggestedAmount}
      />

      <AllocateDialog
        open={allocOpen}
        onOpenChange={setAllocOpen}
        availableTzs={availableTzs}
        goals={[
          {
            id: goalId,
            reference: goalReference,
            productName,
            remainingTzs,
          },
        ]}
        defaultGoalId={goalId}
      />

      <CancelGoalDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        goalId={goalId}
      />
    </>
  );
}
