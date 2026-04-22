"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";

type Installment = {
  id: string;
  sequence: number;
  dueDate: string;
  amountTzs: number;
  paidAt: string | null;
};

type ApiError =
  | "bad_input"
  | "not_found"
  | "forbidden"
  | "unauthenticated"
  | "unknown";

export function ScheduleEditorForm({
  orderId,
  locale,
  editable,
  today,
  installments,
}: {
  orderId: string;
  locale: Locale;
  editable: boolean;
  today: string;
  installments: Installment[];
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.orders.detail;

  const initial = useMemo(() => {
    const map: Record<string, string> = {};
    for (const i of installments) map[i.id] = i.dueDate;
    return map;
  }, [installments]);

  const [dates, setDates] = useState<Record<string, string>>(initial);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const changed = installments.filter(
    (i) => i.paidAt === null && dates[i.id] !== initial[i.id],
  );
  const hasChanges = changed.length > 0;
  const disabled = !editable || !hasChanges || reason.trim().length === 0 || pending;

  async function submit() {
    setError(null);
    setSaved(false);
    if (!hasChanges) return;
    const updates = changed.map((i) => ({ id: i.id, dueDate: dates[i.id] }));
    let res: Response;
    try {
      res = await fetch(`/api/admin/orders/${orderId}/installments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, reason }),
      });
    } catch (err) {
      console.error("[schedule-editor] network", err);
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

  const errorMessage = mapError(error, dict.admin.orders.toast);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(submit);
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-border/60">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">
                {t.installmentsHeaders.sequence}
              </th>
              <th className="px-4 py-2 text-left">
                {t.installmentsHeaders.dueDate}
              </th>
              <th className="px-4 py-2 text-right">
                {t.installmentsHeaders.amount}
              </th>
              <th className="px-4 py-2 text-right">
                {t.installmentsHeaders.state}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {installments.map((inst) => {
              const overdue =
                inst.paidAt === null && inst.dueDate < today ? true : false;
              return (
                <tr key={inst.id}>
                  <td className="px-4 py-2 font-mono text-[12px] text-muted-foreground">
                    {inst.sequence}
                  </td>
                  <td className="px-4 py-2">
                    {editable && inst.paidAt === null ? (
                      <input
                        type="date"
                        value={dates[inst.id] ?? inst.dueDate}
                        min={today}
                        onChange={(e) =>
                          setDates((prev) => ({
                            ...prev,
                            [inst.id]: e.target.value,
                          }))
                        }
                        className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[12px] outline-none"
                      />
                    ) : (
                      formatDate(inst.dueDate, locale, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatTzs(inst.amountTzs, locale)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Badge
                      state={
                        inst.paidAt !== null
                          ? "paid"
                          : overdue
                            ? "overdue"
                            : "unpaid"
                      }
                      labels={t.installmentBadges}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[12px] text-muted-foreground">
            {t.scheduleEditor.hint}
          </p>
          <label className="text-[12px]">{t.scheduleEditor.reasonLabel}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={t.scheduleEditor.reasonPlaceholder}
            required
            className="w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
          />
          <p className="text-[11px] text-muted-foreground">
            {t.scheduleEditor.reasonHint}
          </p>

          {errorMessage ? (
            <p className="text-[12px] text-destructive">{errorMessage}</p>
          ) : null}
          {saved ? (
            <p className="text-[12px] text-emerald-400">
              {dict.admin.orders.toast.scheduleUpdated}
            </p>
          ) : null}

          <Button
            type="submit"
            className="self-start rounded-full"
            disabled={disabled}
          >
            {pending
              ? t.scheduleEditor.saving
              : hasChanges
                ? t.scheduleEditor.submit
                : t.scheduleEditor.noChanges}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t.scheduleEditor.disabledNote}
        </p>
      )}
    </form>
  );
}

function Badge({
  state,
  labels,
}: {
  state: "paid" | "unpaid" | "overdue";
  labels: { paid: string; unpaid: string; overdue: string };
}) {
  const tone =
    state === "paid"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : state === "overdue"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
        : "border-border/60 text-muted-foreground";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${tone}`}
    >
      {labels[state]}
    </span>
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
    case "forbidden":
      return toast.forbidden;
    case "unauthenticated":
      return toast.unauthenticated;
    default:
      return toast.error;
  }
}
