"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTzs } from "@/lib/currency";
import { useDictionary, useLocale } from "@/i18n/provider";

export type AllocateDialogGoal = {
  id: string;
  reference: string;
  productName: string;
  remainingTzs: number;
};

type Step = { kind: "form" } | { kind: "pending" } | { kind: "done" };

export function AllocateDialog({
  open,
  onOpenChange,
  goals,
  availableTzs,
  defaultGoalId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goals: AllocateDialogGoal[];
  availableTzs: number;
  defaultGoalId?: string;
}) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.allocate;
  const walletDict = dict.wallet;

  const firstGoal = goals[0]?.id;
  const [goalId, setGoalId] = React.useState<string | undefined>(
    defaultGoalId ?? firstGoal,
  );
  const [amount, setAmount] = React.useState<number>(
    Math.min(availableTzs, 50_000),
  );
  const [step, setStep] = React.useState<Step>({ kind: "form" });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  React.useEffect(() => {
    if (open) {
      setGoalId(defaultGoalId ?? firstGoal);
      setAmount(Math.min(availableTzs, 50_000));
      setStep({ kind: "form" });
      setError(null);
    }
  }, [open, defaultGoalId, firstGoal, availableTzs]);

  const selectedGoal = goals.find((g) => g.id === goalId);
  const hasGoals = goals.length > 0;
  const insufficient = amount > availableTzs;
  const overshoot = selectedGoal ? amount > selectedGoal.remainingTzs : false;

  const submit = async () => {
    if (!goalId) return;
    setError(null);
    const res = await fetch("/api/wallet/allocate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goalId, amountTzs: amount }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body.error === "insufficient_available") setError(walletDict.insufficient);
      else if (body.error === "goal_not_active") setError(t.goalNotActive);
      else setError(t.errorGeneric);
      return;
    }
    setStep({ kind: "done" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v && step.kind === "done") router.refresh();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step.kind === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>{t.title}</DialogTitle>
              <DialogDescription>
                {t.description.replace("{amount}", formatTzs(availableTzs, locale))}
              </DialogDescription>
            </DialogHeader>

            {!hasGoals ? (
              <p className="mt-4 text-[13px] text-muted-foreground">
                {t.noActiveGoals}
              </p>
            ) : (
              <>
                <div className="mt-2">
                  <Label htmlFor="allocate-goal">{t.goalLabel}</Label>
                  <select
                    id="allocate-goal"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.productName} · {g.reference} (
                        {formatTzs(g.remainingTzs, locale)} {t.remainingSuffix})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <Label htmlFor="allocate-amount">{t.amountLabel}</Label>
                  <Input
                    id="allocate-amount"
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-2 text-lg"
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t.availableHint.replace(
                      "{amount}",
                      formatTzs(availableTzs, locale),
                    )}
                  </p>
                </div>

                {insufficient && (
                  <p className="mt-2 text-[12px] text-destructive">
                    {walletDict.insufficient}
                  </p>
                )}
                {!insufficient && overshoot && (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {t.overshootHint}
                  </p>
                )}
                {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}

                <DialogFooter className="mt-4">
                  <Button
                    className="w-full rounded-full"
                    size="lg"
                    onClick={() => startTransition(submit)}
                    disabled={
                      !goalId || amount < 1000 || insufficient || pending
                    }
                  >
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t.submit}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}

        {step.kind === "done" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="h-5 w-5" />
            </div>
            <p className="font-medium">
              {t.success.replace("{amount}", formatTzs(amount, locale))}
            </p>
            <Button
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              size="lg"
            >
              {t.doneButton}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
