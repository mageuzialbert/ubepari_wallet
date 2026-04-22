import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";
import { listAdminPayments } from "@/lib/admin/payments";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import type {
  PaymentKind,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/supabase/types";
import { getDictionary } from "../../dictionaries";
import { ReconcileButton } from "./_components/reconcile-button";
import { RefundButton } from "@/app/[locale]/admin/_components/refund-button";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{
  q?: string;
  status?: string;
  kind?: string;
  provider?: string;
  from?: string;
  to?: string;
}>;

const STATUSES = ["all", "pending", "success", "failed"] as const;
const KINDS = ["all", "deposit", "installment", "topup", "refund"] as const;
const PROVIDERS = ["all", "mpesa", "tigopesa", "airtelmoney", "card"] as const;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.payments.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminPaymentsListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof STATUSES)[number])
    : "all";
  const kind = (KINDS as readonly string[]).includes(sp.kind ?? "")
    ? (sp.kind as (typeof KINDS)[number])
    : "all";
  const provider = (PROVIDERS as readonly string[]).includes(sp.provider ?? "")
    ? (sp.provider as (typeof PROVIDERS)[number])
    : "all";
  const q = (sp.q ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();

  const dict = await getDictionary(locale);
  const t = dict.admin.payments;

  const rows = await listAdminPayments(
    {
      status: status === "all" ? "all" : (status as PaymentStatus),
      kind: kind === "all" ? "all" : (kind as PaymentKind),
      provider: provider === "all" ? "all" : (provider as PaymentProvider),
      q: q || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    locale,
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] text-muted-foreground">{t.body}</p>
      </header>

      <form
        method="GET"
        action={`/${locale}/admin/payments`}
        className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:items-end"
      >
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-2">
          <span className="text-[11px] text-muted-foreground">
            {t.list.searchPlaceholder}
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder={t.list.searchPlaceholder}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t.list.filters.statusLabel}
          </span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? t.list.filters.all : t.statusLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t.list.filters.kindLabel}
          </span>
          <select
            name="kind"
            defaultValue={kind}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "all" ? t.list.filters.all : t.kindLabels[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t.list.filters.providerLabel}
          </span>
          <select
            name="provider"
            defaultValue={provider}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? t.list.filters.all : t.providerLabels[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t.list.filters.fromLabel}
          </span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">
            {t.list.filters.toLabel}
          </span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          />
        </label>
        <button
          type="submit"
          className="col-span-2 rounded-full bg-foreground px-4 py-2 text-[12px] font-medium text-background sm:col-span-1"
        >
          {t.list.applyFilters}
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-10 text-center text-[14px] text-muted-foreground">
          {t.list.empty}
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60">
          {rows.map((row) => {
            const displayName =
              [row.user.first_name, row.user.last_name]
                .filter(Boolean)
                .join(" ")
                .trim() || row.user.phone;
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.kindLabels[row.kind]}</p>
                    <StatusPill status={row.status} labels={t.statusLabels} />
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {displayName} · +{row.user.phone}
                    {row.order ? (
                      <>
                        {" · "}
                        <Link
                          href={`/${locale}/admin/orders/${row.order.id}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {row.order.reference}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDate(row.created_at, locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {t.providerLabels[row.provider]}
                    {row.evmark_ref ? ` · ${row.evmark_ref}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatTzs(row.amount_tzs, locale)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {row.status === "pending" ? (
                    <ReconcileButton paymentId={row.id} locale={locale} />
                  ) : null}
                  {row.status === "success" && row.kind !== "refund" ? (
                    <RefundButton
                      paymentId={row.id}
                      maxAmountTzs={row.amount_tzs}
                      locale={locale}
                      variant="row"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({
  status,
  labels,
}: {
  status: PaymentStatus;
  labels: { pending: string; success: string; failed: string };
}) {
  const tone =
    status === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "failed"
        ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
        : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${tone}`}
    >
      {labels[status]}
    </span>
  );
}
