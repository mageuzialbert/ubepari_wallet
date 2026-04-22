import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { listAdminOrders } from "@/lib/admin/orders";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import type { OrderStatus } from "@/lib/supabase/types";
import { getDictionary } from "../../dictionaries";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}>;

const TABS = ["all", "pending", "active", "completed", "cancelled"] as const;
type TabKey = (typeof TABS)[number];

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.orders.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminOrdersListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const sp = await searchParams;
  const status: TabKey = (TABS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as TabKey)
    : "all";
  const q = (sp.q ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();

  const dict = await getDictionary(locale);
  const t = dict.admin.orders;

  const rows = await listAdminOrders(
    {
      status: status === "all" ? "all" : (status as OrderStatus),
      q: q || undefined,
      from: from || undefined,
      to: to || undefined,
    },
    locale,
  );

  function tabHref(next: TabKey) {
    const qs = new URLSearchParams();
    if (next !== "all") qs.set("status", next);
    if (q) qs.set("q", q);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const suffix = qs.toString();
    return `/${locale}/admin/orders${suffix ? `?${suffix}` : ""}`;
  }

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

      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab === status;
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "border border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.list.tabs[tab]}
            </Link>
          );
        })}
      </nav>

      <form
        method="GET"
        action={`/${locale}/admin/orders`}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder={t.list.searchPlaceholder}
          className="flex-1 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
        />
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          aria-label={t.list.filters.fromLabel}
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
          aria-label={t.list.filters.toLabel}
        />
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-[12px] font-medium text-background"
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
              <li key={row.id}>
                <Link
                  href={`/${locale}/admin/orders/${row.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-background/40">
                    {row.product.image ? (
                      <Image
                        src={row.product.image}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">
                      {row.product.name}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {row.reference} · {displayName}
                    </p>
                  </div>
                  <div className="hidden min-w-[120px] text-right sm:block">
                    <p className="text-[13px] font-medium">
                      {formatTzs(row.total_tzs, locale)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatTzs(row.monthly_tzs, locale)} ·{" "}
                      {t.list.termLabel.replace(
                        "{n}",
                        String(row.plan_months),
                      )}
                    </p>
                  </div>
                  <StatusPill status={row.status} labels={t.detail.statusLabels} />
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:block">
                    {formatDate(row.created_at, locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
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
  status: OrderStatus;
  labels: { pending: string; active: string; completed: string; cancelled: string };
}) {
  const tone =
    status === "active"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "completed"
        ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
        : status === "cancelled"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] sm:inline-flex ${tone}`}
    >
      {labels[status]}
    </span>
  );
}
