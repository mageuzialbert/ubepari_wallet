"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { ContributeDialog } from "@/components/goals/contribute-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTzs } from "@/lib/currency";
import type { GoalTerm } from "@/lib/goal";
import { useDictionary, useLocale } from "@/i18n/provider";

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "done"; goalId: string }
  | { kind: "redirect"; reason: "signin" | "kyc" | "too_many" | "error"; detail?: string };

export function StartGoalDialog({
  open,
  onOpenChange,
  productSlug,
  productName,
  termMonths,
  monthlyTarget,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productSlug: string;
  productName: string;
  termMonths: GoalTerm;
  monthlyTarget: number;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const t = dict.startGoal;
  const tGoal = dict.goal;

  const [phase, setPhase] = React.useState<Phase>({ kind: "form" });
  const [contributeOpen, setContributeOpen] = React.useState(false);

  function reset() {
    setPhase({ kind: "form" });
  }

  async function submit() {
    setPhase({ kind: "submitting" });
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productSlug, termMonths }),
    });
    if (res.status === 401) {
      setPhase({ kind: "redirect", reason: "signin" });
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 403) {
      setPhase({ kind: "redirect", reason: "kyc" });
      return;
    }
    if (res.status === 409) {
      setPhase({ kind: "redirect", reason: "too_many" });
      return;
    }
    if (!res.ok || !body.goalId) {
      setPhase({ kind: "redirect", reason: "error", detail: body.error });
      return;
    }
    setPhase({ kind: "done", goalId: body.goalId });
  }

  const monthlyLabel = formatTzs(monthlyTarget, locale);
  const description = t.description
    .replace("{monthly}", monthlyLabel)
    .replace("{months}", String(termMonths));
  const title = t.title.replace("{product}", productName);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {(phase.kind === "form" || phase.kind === "submitting") && (
            <>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => onOpenChange(false)}
                  disabled={phase.kind === "submitting"}
                >
                  {t.cancelButton}
                </Button>
                <Button
                  className="rounded-full"
                  disabled={phase.kind === "submitting"}
                  onClick={submit}
                >
                  {phase.kind === "submitting" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {t.confirmButton}
                </Button>
              </DialogFooter>
            </>
          )}

          {phase.kind === "done" && (
            <div className="space-y-4 py-2 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{t.successTitle}</h3>
                <p className="mt-2 text-[14px] text-muted-foreground">{t.successBody}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="rounded-full"
                  onClick={() => setContributeOpen(true)}
                >
                  {t.successContributeNow}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/${locale}/account/goals/${phase.goalId}`);
                  }}
                >
                  {t.successViewGoal}
                </Button>
              </div>
              <ContributeDialog
                open={contributeOpen}
                onOpenChange={setContributeOpen}
                goalId={phase.goalId}
                productName={productName}
                onSettled={() => {
                  onOpenChange(false);
                  router.push(`/${locale}/account/goals/${phase.goalId}`);
                }}
              />
            </div>
          )}

          {phase.kind === "redirect" && (
            <div className="space-y-4 py-2 text-center">
              <p className="text-[14px]">
                {phase.reason === "signin"
                  ? tGoal.needsSignIn
                  : phase.reason === "kyc"
                    ? tGoal.needsKyc
                    : phase.reason === "too_many"
                      ? tGoal.tooManyActive.replace("{max}", "3")
                      : t.errorGeneric}
              </p>
              {phase.reason === "signin" && (
                <Button
                  className="rounded-full"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/${locale}/signin`);
                  }}
                >
                  {tGoal.signInCta}
                </Button>
              )}
              {phase.reason === "kyc" && (
                <Button
                  className="rounded-full"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(`/${locale}/kyc`);
                  }}
                >
                  {tGoal.kycCta}
                </Button>
              )}
              {(phase.reason === "too_many" || phase.reason === "error") && (
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => reset()}
                >
                  {t.cancelButton}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
