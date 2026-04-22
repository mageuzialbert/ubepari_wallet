import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Clock,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import {
  getPaymentsHistory,
  type PaymentHistoryFilter,
  type PaymentHistoryItem,
} from "@/lib/wallet-data";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "../../dictionaries";
import type { Dictionary } from "@/i18n/types";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ kind?: string }>;

const FILTERS: PaymentHistoryFilter[] = [
  "all",
  "deposit",
  "installment",
  "topup",
  "refund",
];

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.account.payments.metaTitle };
}

export default async function PaymentsHistoryPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const sp = await searchParams;
  const requested = (sp.kind ?? "all") as PaymentHistoryFilter;
  const filter: PaymentHistoryFilter = FILTERS.includes(requested)
    ? requested
    : "all";

  const { client, userId } = await requireSupabaseForUser();
  const items = await getPaymentsHistory(client, userId, locale, filter);

  const dict = await getDictionary(locale);
  const t = dict.account.payments;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <Link
        href={`/${locale}/account`}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t.back}
      </Link>

      <header className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          {t.subheading}
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const label =
            f === "all"
              ? t.filterAll
              : f === "deposit"
                ? t.filterDeposits
                : f === "installment"
                  ? t.filterInstallments
                  : f === "topup"
                    ? t.filterTopups
                    : t.filterRefunds;
          const active = f === filter;
          const href =
            f === "all"
              ? `/${locale}/account/payments`
              : `/${locale}/account/payments?kind=${f}`;
          return (
            <Link
              key={f}
              href={href}
              className={`rounded-full border px-4 py-1.5 text-[12px] transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center">
            <p className="text-[14px] text-muted-foreground">
              {filter === "all" ? t.empty : t.emptyFiltered}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
            {items.map((item) => (
              <PaymentRow
                key={item.id}
                item={item}
                locale={locale}
                dict={dict}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PaymentRow({
  item,
  locale,
  dict,
}: {
  item: PaymentHistoryItem;
  locale: Locale;
  dict: Dictionary;
}) {
  const h = dict.orders.detail.history;
  const t = dict.account.payments;

  const kindLabel =
    item.kind === "deposit"
      ? h.kindDeposit
      : item.kind === "installment"
        ? h.kindInstallment
        : item.kind === "topup"
          ? t.topupRow
          : t.refundRow;

  const providerLabel =
    item.provider === "mpesa"
      ? h.providerMpesa
      : item.provider === "tigopesa"
        ? h.providerTigopesa
        : item.provider === "airtelmoney"
          ? h.providerAirtelmoney
          : h.providerCard;

  const statusVariant: "default" | "outline" | "destructive" =
    item.status === "success"
      ? "default"
      : item.status === "failed"
        ? "destructive"
        : "outline";

  const statusLabel =
    item.status === "success"
      ? h.statusSuccess
      : item.status === "failed"
        ? h.statusFailed
        : h.statusPending;

  const isOutflow = item.kind === "refund";
  const Icon =
    item.status === "failed"
      ? XCircle
      : item.status === "pending"
        ? Clock
        : isOutflow
          ? ArrowDownLeft
          : ArrowUpRight;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            item.status === "failed"
              ? "bg-destructive/10 text-destructive"
              : item.status === "pending"
                ? "bg-muted text-muted-foreground"
                : isOutflow
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[14px] font-medium tracking-tight">
            {kindLabel} · {providerLabel}
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDate(item.settledAt ?? item.createdAt, locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {item.order && (
              <>
                {" · "}
                <Link
                  href={`/${locale}/orders/${item.order.id}`}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {t.linkedOrder}{" "}
                  <span className="font-mono">{item.order.reference}</span>
                </Link>
              </>
            )}
            {item.evmarkRef && (
              <>
                {" · "}
                {h.refLabel}{" "}
                <span className="font-mono">{item.evmarkRef}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className={`text-right text-[14px] font-semibold tracking-tight ${
          isOutflow ? "text-destructive" : ""
        }`}
      >
        {isOutflow ? "−" : "+"}
        {formatTzs(item.amountTzs, locale)}
      </div>
    </li>
  );
}
