import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  Hash,
  Receipt,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PayInstallmentDialog } from "@/components/wallet/pay-installment-dialog";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import { getOrderDetail, type OrderDetail } from "@/lib/wallet-data";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "../../dictionaries";
import type { Dictionary } from "@/i18n/types";

type PageParams = Promise<{ locale: string; id: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.orders.detail.metaTitle };
}

export default async function OrderDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const { client, userId } = await requireSupabaseForUser();
  const order = await getOrderDetail(client, userId, id, locale);

  const dict = await getDictionary(locale);
  const t = dict.orders;

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        <Link
          href={`/${locale}/orders`}
          className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {t.detail.back}
        </Link>
        <div className="mt-10 rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-[17px] font-semibold">{t.detail.notFoundTitle}</p>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {t.detail.notFoundBody}
          </p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const nextUnpaid = order.installments.find((i) => i.paidAt === null);

  const statusLabel = (s: string) =>
    s === "pending"
      ? t.statusPending
      : s === "active"
        ? t.statusActive
        : s === "completed"
          ? t.statusCompleted
          : t.statusCancelled;

  const statusVariant: "default" | "secondary" | "outline" | "destructive" =
    order.status === "active"
      ? "default"
      : order.status === "completed"
        ? "secondary"
        : order.status === "cancelled"
          ? "destructive"
          : "outline";

  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <Link
        href={`/${locale}/orders`}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t.detail.back}
      </Link>

      {/* Hero */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-border/60 bg-card">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          {order.product.image && (
            <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl border border-border/60">
              <Image
                src={order.product.image}
                alt={order.product.name}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>{statusLabel(order.status)}</Badge>
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.hirePurchaseLabel} ·{" "}
                {t.detail.planLabel.replace("{months}", String(order.termMonths))}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {order.product.name}
            </h1>
            {order.product.tagline && (
              <p className="mt-1 text-[14px] text-muted-foreground">
                {order.product.tagline}
              </p>
            )}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                <dt className="sr-only">{t.detail.referenceLabel}</dt>
                <dd className="font-mono">{order.reference}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <dd>
                  {t.detail.placedOn.replace(
                    "{date}",
                    formatDate(order.createdAt, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  )}
                </dd>
              </div>
              {order.activatedAt && (
                <div className="flex items-center gap-1.5">
                  <Check className="h-3 w-3" />
                  <dd>
                    {t.detail.activatedOn.replace(
                      "{date}",
                      formatDate(order.activatedAt, locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }),
                    )}
                  </dd>
                </div>
              )}
            </dl>
            {order.status === "active" && nextUnpaid && (
              <div className="mt-5">
                <PayInstallmentDialog
                  installmentId={nextUnpaid.id}
                  amountTzs={nextUnpaid.amountTzs}
                  trigger={
                    <Button className="rounded-full" size="lg">
                      {t.detail.payNext} · {formatTzs(nextUnpaid.amountTzs, locale)}
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
        <BreakdownCard order={order} t={dict} locale={locale} />
        <ScheduleCard order={order} t={dict} locale={locale} today={today} />
      </div>

      <div className="mt-4">
        <HistoryCard order={order} t={dict} locale={locale} />
      </div>
    </div>
  );
}

function BreakdownCard({
  order,
  t,
  locale,
}: {
  order: OrderDetail;
  t: Dictionary;
  locale: Locale;
}) {
  const b = t.orders.detail.breakdown;
  const rows: [string, number, boolean?][] = [
    [b.cashPrice, order.cashPriceTzs],
    [b.deposit, order.depositTzs],
    [b.financed, order.financedTzs],
    [b.serviceFee, order.serviceFeeTzs],
    [b.total, order.totalTzs, true],
    [b.monthly, order.monthlyTzs],
  ];
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Receipt className="h-3 w-3" /> {b.title}
      </h2>
      <dl className="mt-5 divide-y divide-border/60">
        {rows.map(([label, value, emphasize]) => (
          <div
            key={label}
            className="flex items-center justify-between py-3 text-[14px]"
          >
            <dt
              className={
                emphasize ? "font-semibold tracking-tight" : "text-muted-foreground"
              }
            >
              {label}
            </dt>
            <dd
              className={
                emphasize
                  ? "text-[17px] font-semibold tracking-tight"
                  : "font-medium tracking-tight"
              }
            >
              {formatTzs(value, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ScheduleCard({
  order,
  t,
  locale,
  today,
}: {
  order: OrderDetail;
  t: Dictionary;
  locale: Locale;
  today: string;
}) {
  const s = t.orders.detail.schedule;
  const nextUnpaidId = order.installments.find((i) => i.paidAt === null)?.id;

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Calendar className="h-3 w-3" /> {s.title}
      </h2>
      <ul className="mt-5 space-y-2">
        {order.installments.map((i) => {
          const paid = i.paidAt !== null;
          const next = !paid && i.id === nextUnpaidId;
          const overdue = !paid && i.dueDate < today;
          return (
            <li
              key={i.id}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-[13px] ${
                paid
                  ? "border-primary/30 bg-primary/5"
                  : overdue
                    ? "border-destructive/40 bg-destructive/5"
                    : next
                      ? "border-foreground/40"
                      : "border-border/60"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold">
                {paid ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : overdue ? (
                  <Clock className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  `M${i.sequence}`
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium tracking-tight">
                  {formatDate(i.dueDate, locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {paid && i.paidAt
                    ? s.paidOn.replace(
                        "{date}",
                        formatDate(i.paidAt, locale, {
                          day: "numeric",
                          month: "short",
                        }),
                      )
                    : overdue
                      ? s.overdue
                      : next
                        ? s.next
                        : s.unpaid}
                </div>
              </div>
              <div className="text-right text-[14px] font-semibold tracking-tight">
                {formatTzs(i.amountTzs, locale)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HistoryCard({
  order,
  t,
  locale,
}: {
  order: OrderDetail;
  t: Dictionary;
  locale: Locale;
}) {
  const h = t.orders.detail.history;

  const kindLabel = (k: OrderDetail["payments"][number]["kind"]) =>
    k === "deposit"
      ? h.kindDeposit
      : k === "installment"
        ? h.kindInstallment
        : k === "refund"
          ? h.kindRefund
          : k;

  const providerLabel = (
    p: OrderDetail["payments"][number]["provider"],
  ) =>
    p === "mpesa"
      ? h.providerMpesa
      : p === "tigopesa"
        ? h.providerTigopesa
        : p === "airtelmoney"
          ? h.providerAirtelmoney
          : h.providerCard;

  const statusBadge = (
    s: OrderDetail["payments"][number]["status"],
  ): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } =>
    s === "success"
      ? { label: h.statusSuccess, variant: "default" }
      : s === "failed"
        ? { label: h.statusFailed, variant: "destructive" }
        : { label: h.statusPending, variant: "outline" };

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <CreditCard className="h-3 w-3" /> {h.title}
      </h2>
      {order.payments.length === 0 ? (
        <p className="mt-5 text-[14px] text-muted-foreground">{h.empty}</p>
      ) : (
        <ul className="mt-5 divide-y divide-border/60">
          {order.payments.map((p) => {
            const badge = statusBadge(p.status);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {p.status === "failed" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : p.status === "success" ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[14px] font-medium tracking-tight">
                      {kindLabel(p.kind)} · {providerLabel(p.provider)}
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDate(p.settledAt ?? p.createdAt, locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {p.evmarkRef && (
                        <>
                          {" · "}
                          {h.refLabel}{" "}
                          <span className="font-mono">{p.evmarkRef}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-right text-[14px] font-semibold tracking-tight ${
                    p.kind === "refund" ? "text-destructive" : ""
                  }`}
                >
                  {p.kind === "refund" ? "−" : "+"}
                  {formatTzs(p.amountTzs, locale)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
