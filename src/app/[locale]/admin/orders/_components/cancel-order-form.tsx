"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

type ApiError =
  | "bad_input"
  | "not_found"
  | "wrong_status"
  | "forbidden"
  | "unauthenticated"
  | "unknown";

export function CancelOrderForm({
  orderId,
  locale,
}: {
  orderId: string;
  locale: Locale;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.orders;

  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    setSaved(false);
    let res: Response;
    try {
      res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch (err) {
      console.error("[cancel-order] network", err);
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
    setSaved(true);
    setReason("");
    startTransition(() => {
      router.refresh();
    });
  }

  const disabled = reason.trim().length === 0 || pending;
  const errorMessage = mapError(error, t.toast);

  return (
    <form
      className="rounded-3xl border border-border/60 bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(submit);
      }}
    >
      <h3 className="text-[13px] font-semibold tracking-tight">
        {t.detail.cancelOrder.title}
      </h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t.detail.cancelOrder.body}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-[12px]">{t.detail.cancelOrder.reasonLabel}</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t.detail.cancelOrder.reasonPlaceholder}
          required
          className="w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
        />
        <p className="text-[11px] text-muted-foreground">
          {t.detail.cancelOrder.reasonHint}
        </p>

        {errorMessage ? (
          <p className="text-[12px] text-destructive">{errorMessage}</p>
        ) : null}
        {saved ? (
          <p className="text-[12px] text-emerald-400">{t.toast.cancelled}</p>
        ) : null}

        <Button
          type="submit"
          variant="outline"
          className="rounded-full border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          disabled={disabled}
        >
          {pending ? t.detail.cancelOrder.saving : t.detail.cancelOrder.submit}
        </Button>
      </div>
    </form>
  );
}

function mapError(
  err: string | null,
  toast: ReturnType<typeof useDictionary>["admin"]["orders"]["toast"],
): string | null {
  if (!err) return null;
  switch (err as ApiError) {
    case "bad_input":
      return toast.validation;
    case "not_found":
      return toast.notFound;
    case "wrong_status":
      return toast.wrongStatus;
    case "forbidden":
      return toast.forbidden;
    case "unauthenticated":
      return toast.unauthenticated;
    default:
      return toast.error;
  }
}
