"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

type ApiError =
  | "bad_input"
  | "not_found"
  | "wrong_status"
  | "settle_failed"
  | "forbidden"
  | "unauthenticated"
  | "unknown";

export function ReconcileButton({
  paymentId,
  locale,
}: {
  paymentId: string;
  locale: Locale;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.payments.reconcile;
  const toast = dict.admin.payments.toast;

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    let res: Response;
    try {
      res = await fetch(`/api/admin/payments/${paymentId}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch (err) {
      console.error("[reconcile] network", err);
      setError("unknown");
      return;
    }
    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: ApiError;
    };
    if (!res.ok || !body.ok) {
      setError(body.error ?? "unknown");
      return;
    }
    setOpen(false);
    setReason("");
    startTransition(() => {
      router.refresh();
    });
  }

  const disabled = reason.trim().length === 0 || pending;
  const errorMessage = mapError(error, toast);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium hover:bg-muted"
        >
          {dict.admin.payments.list.reconcileAction}
        </button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(submit);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.title}</DialogTitle>
            <DialogDescription>{t.body}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-3">
            <label className="text-[12px]">{t.reasonLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t.reasonPlaceholder}
              required
              className="w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
            />
            <p className="text-[11px] text-muted-foreground">{t.reasonHint}</p>
            <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
              {t.confirmBody}
            </p>

            {errorMessage ? (
              <p className="text-[12px] text-destructive">{errorMessage}</p>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-full">
                {dict.admin.refund.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-full" disabled={disabled}>
              {pending ? t.saving : t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function mapError(
  err: string | null,
  toast: ReturnType<typeof useDictionary>["admin"]["payments"]["toast"],
): string | null {
  if (!err) return null;
  switch (err as ApiError) {
    case "bad_input":
      return toast.validation;
    case "not_found":
      return toast.notFound;
    case "wrong_status":
      return toast.wrongStatus;
    case "settle_failed":
      return toast.settleFailed;
    case "forbidden":
      return toast.forbidden;
    case "unauthenticated":
      return toast.unauthenticated;
    default:
      return toast.error;
  }
}
