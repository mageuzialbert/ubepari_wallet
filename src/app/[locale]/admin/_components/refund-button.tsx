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
import { formatTzs } from "@/lib/currency";

type ApiError =
  | "bad_input"
  | "not_found"
  | "wrong_status"
  | "wrong_kind"
  | "amount_out_of_range"
  | "forbidden"
  | "unauthenticated"
  | "unknown";

export function RefundButton({
  paymentId,
  maxAmountTzs,
  locale,
  variant = "compact",
}: {
  paymentId: string;
  maxAmountTzs: number;
  locale: Locale;
  variant?: "compact" | "row";
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.refund;
  const paymentsToast = dict.admin.payments.toast;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(maxAmountTzs));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
      setError("bad_input");
      return;
    }
    let res: Response;
    try {
      res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.floor(numeric), reason }),
      });
    } catch (err) {
      console.error("[refund] network", err);
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
    setAmount(String(maxAmountTzs));
    startTransition(() => {
      router.refresh();
    });
  }

  const errorMessage = mapError(error, paymentsToast);
  const disabled = reason.trim().length === 0 || pending;

  const triggerClass =
    variant === "row"
      ? "rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium hover:bg-muted"
      : "shrink-0 rounded-full border border-rose-500/40 px-3 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/10";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClass}>
          {dict.admin.payments.list.refundAction}
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

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="text-[12px]">{t.amountLabel}</label>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1}
                max={maxAmountTzs}
                required
                className="mt-1.5 w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.amountHint.replace("{max}", formatTzs(maxAmountTzs, locale))}
              </p>
            </div>

            <div>
              <label className="text-[12px]">{t.reasonLabel}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={t.reasonPlaceholder}
                required
                className="mt-1.5 w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.reasonHint}
              </p>
            </div>

            {errorMessage ? (
              <p className="text-[12px] text-destructive">{errorMessage}</p>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-full">
                {t.cancel}
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
    case "wrong_kind":
      return toast.wrongKind;
    case "amount_out_of_range":
      return toast.amountOutOfRange;
    case "forbidden":
      return toast.forbidden;
    case "unauthenticated":
      return toast.unauthenticated;
    default:
      return toast.error;
  }
}
