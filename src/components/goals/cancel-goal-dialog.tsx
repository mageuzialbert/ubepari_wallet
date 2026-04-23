"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
import { useDictionary } from "@/i18n/provider";

export function CancelGoalDialog({
  open,
  onOpenChange,
  goalId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goalId: string;
}) {
  const t = useDictionary().goals;
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const res = await fetch(`/api/goals/${goalId}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || null }),
    });
    if (!res.ok) {
      setError("error");
      return;
    }
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.cancelDialogTitle}</DialogTitle>
          <DialogDescription>{t.cancelDialogBody}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{t.cancelReasonLabel}</Label>
          <Input
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>
        {error && <p className="text-[12px] text-destructive">Something went wrong.</p>}
        <DialogFooter>
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {t.cancelKeep}
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={() => startTransition(submit)}
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.cancelConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
