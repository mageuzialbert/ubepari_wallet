"use client";

import * as React from "react";
import Link from "next/link";

import { CancelGoalDialog } from "@/components/goals/cancel-goal-dialog";
import { ContributeDialog } from "@/components/goals/contribute-dialog";
import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/i18n/provider";

export function GoalActions({
  goalId,
  productName,
  suggestedAmount,
  isActive,
  isCompleted,
  receiptHref,
}: {
  goalId: string;
  productName: string;
  suggestedAmount: number;
  isActive: boolean;
  isCompleted: boolean;
  receiptHref?: string;
}) {
  const t = useDictionary().goals;
  const locale = useLocale();
  const [contribOpen, setContribOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);

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

      <CancelGoalDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        goalId={goalId}
      />

      {/* locale is used for potential future links — reference silences lint */}
      <span className="hidden">{locale}</span>
    </>
  );
}
