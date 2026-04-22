import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";
import { getDashboardKpis } from "@/lib/admin-data";
import { formatTzs } from "@/lib/currency";
import { getDictionary } from "../dictionaries";

type DashboardParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: DashboardParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.dashboard.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function AdminDashboardPage({
  params,
}: {
  params: DashboardParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.admin.dashboard;
  const kpis = await getDashboardKpis();

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h1>
        <p className="mt-3 max-w-xl text-[14px] text-muted-foreground">
          {t.body}
        </p>
      </header>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {t.sections.orders}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={t.labels.today} value={kpis.orders.today.toString()} />
          <Kpi label={t.labels.sevenDays} value={kpis.orders.week.toString()} />
          <Kpi label={t.labels.thirtyDays} value={kpis.orders.month.toString()} />
          <Kpi label={t.labels.active} value={kpis.orders.active.toString()} />
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {t.sections.revenue}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi
            label={t.labels.today}
            value={formatTzs(kpis.revenue.today, locale)}
          />
          <Kpi
            label={t.labels.sevenDays}
            value={formatTzs(kpis.revenue.week, locale)}
          />
          <Kpi
            label={t.labels.thirtyDays}
            value={formatTzs(kpis.revenue.month, locale)}
          />
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          {t.revenueNote}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kpi
          label={t.labels.pendingKyc}
          value={kpis.pendingKyc.toString()}
          tone={kpis.pendingKyc > 0 ? "accent" : "muted"}
        />
        <Kpi
          label={t.labels.overdue}
          value={kpis.overdueInstallments.toString()}
          tone={kpis.overdueInstallments > 0 ? "warn" : "muted"}
        />
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {t.sections.lowStock}
        </h2>
        {kpis.lowStock.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t.lowStockEmpty}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60">
            {kpis.lowStock.map((p) => (
              <li
                key={p.slug}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">
                    {p.nameEn}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {p.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-400">
                    {t.labels.stock.replace("{n}", String(p.stock))}
                  </span>
                  <Link
                    href={`/${locale}/store/${p.slug}`}
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    {t.labels.view}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "accent" | "warn";
}) {
  const toneClass =
    tone === "accent"
      ? "border-foreground/30"
      : tone === "warn"
        ? "border-amber-500/40"
        : "border-border/60";
  return (
    <div className={`rounded-3xl border ${toneClass} bg-card px-5 py-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
