"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { formatTzs } from "@/lib/currency";

type ApiError =
  | "bad_input"
  | "not_found"
  | "forbidden"
  | "unauthenticated"
  | "unknown";

export function CreditLimitForm({
  userId,
  locale,
  currentLimitTzs,
}: {
  userId: string;
  locale: Locale;
  currentLimitTzs: number;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.users;

  const [amount, setAmount] = useState<string>(String(currentLimitTzs));
  const [reason, setReason] = useState("");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    setIssues({});
    setSaved(false);

    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) {
      setIssues({ amount: "range" });
      return;
    }

    let res: Response;
    try {
      res = await fetch(`/api/admin/users/${userId}/credit-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.floor(numeric), reason }),
      });
    } catch (err) {
      console.error("[credit-limit-form] network error", err);
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
      issues?: Record<string, string>;
    };

    if (!res.ok || !body.ok) {
      setError(body.error ?? "unknown");
      if (body.issues) setIssues(body.issues);
      return;
    }

    setSaved(true);
    setReason("");
    startTransition(() => {
      router.refresh();
    });
  }

  const topMessage = errorMessage(error, t);
  const amountIssue = issues.amount ? t.toast.validation : null;
  const reasonIssue = issues.reason ? t.toast.reasonRequired : null;
  const dirty = Number(amount) !== currentLimitTzs || reason.trim().length > 0;

  return (
    <form
      className="rounded-3xl border border-border/60 bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(submit);
      }}
    >
      <h3 className="text-[13px] font-semibold tracking-tight">{t.creditLimit.title}</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t.creditLimit.currentLabel}: {formatTzs(currentLimitTzs, locale)}
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <Label className="text-[12px]">{t.creditLimit.newLabel}</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            max={100_000_000}
            required
            className="mt-1.5"
          />
          {amountIssue ? (
            <p className="mt-1 text-[11px] text-destructive">{amountIssue}</p>
          ) : null}
        </div>

        <div>
          <Label className="text-[12px]">{t.creditLimit.reasonLabel}</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t.creditLimit.reasonPlaceholder}
            required
            className="mt-1.5 w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{t.creditLimit.reasonHint}</p>
          {reasonIssue ? (
            <p className="mt-1 text-[11px] text-destructive">{reasonIssue}</p>
          ) : null}
        </div>

        {topMessage ? (
          <p className="text-[12px] text-destructive">{topMessage}</p>
        ) : null}
        {saved ? (
          <p className="text-[12px] text-emerald-400">{t.toast.creditUpdated}</p>
        ) : null}

        <Button
          type="submit"
          className="rounded-full"
          disabled={pending || !dirty || reason.trim().length === 0}
        >
          {pending ? t.creditLimit.saving : t.creditLimit.submit}
        </Button>
      </div>
    </form>
  );
}

function errorMessage(
  err: string | null,
  t: ReturnType<typeof useDictionary>["admin"]["users"],
): string | null {
  if (!err) return null;
  switch (err as ApiError) {
    case "bad_input":
      return t.toast.validation;
    case "not_found":
      return t.toast.notFound;
    case "forbidden":
      return t.toast.forbidden;
    case "unauthenticated":
      return t.toast.unauthenticated;
    default:
      return t.toast.error;
  }
}
