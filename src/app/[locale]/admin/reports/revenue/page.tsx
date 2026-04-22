import type { Metadata } from "next";

import { hasLocale } from "@/i18n/config";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import { getRevenueReport } from "@/lib/reports";
import {
  DEFAULT_RANGE,
  parseRangeFromSearchParams,
} from "@/lib/reports-range";
import type { PaymentProvider } from "@/lib/supabase/types";
import { Kpi } from "@/components/admin/kpi";
import { CsvLink } from "@/components/admin/reports/csv-link";
import { RangeTabs } from "@/components/admin/reports/range-tabs";
import { ReportsSubnav } from "@/components/admin/reports/subnav";
import { RevenueChart } from "@/components/admin/reports/revenue-chart";
import { getDictionary } from "../../../dictionaries";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ range?: string }>;

const PROVIDERS: PaymentProvider[] = ["mpesa", "tigopesa", "airtelmoney", "card"];

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.reports.revenue.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminRevenueReportPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const sp = await searchParams;
  const range = parseRangeFromSearchParams(sp);

  const dict = await getDictionary(locale);
  const t = dict.admin.reports;
  const tr = t.revenue;

  const report = await getRevenueReport(range);

  const exportHref = `/api/admin/reports/revenue/export?range=${range.key}`;

  return (
    <>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] text-muted-foreground">
          {tr.body}
        </p>
      </header>

      <ReportsSubnav
        locale={locale}
        active="revenue"
        labels={t.nav}
        query={{ range: range.key !== DEFAULT_RANGE ? range.key : undefined }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeTabs
          locale={locale}
          basePath="admin/reports/revenue"
          active={range.key}
          labels={t.range}
        />
        <CsvLink href={exportHref} label={t.export.csv} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={tr.kpi.total} value={formatTzs(report.totals.total, locale)} />
        <Kpi
          label={tr.kpi.deposit}
          value={formatTzs(report.totals.deposit, locale)}
        />
        <Kpi
          label={tr.kpi.installment}
          value={formatTzs(report.totals.installment, locale)}
        />
        <Kpi
          label={tr.kpi.topup}
          value={formatTzs(report.totals.topup, locale)}
        />
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.chart.heading}
        </h2>
        <div className="mt-4">
          {report.totals.count === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              {t.export.empty}
            </p>
          ) : (
            <RevenueChart
              data={report.daily}
              labels={{
                deposit: tr.kpi.deposit,
                installment: tr.kpi.installment,
                topup: tr.kpi.topup,
                total: tr.kpi.total,
              }}
              locale={locale}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.chart.byProvider}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <Kpi
              key={p}
              label={dict.admin.payments.providerLabels[p]}
              value={formatTzs(report.byProvider[p], locale)}
              tone={report.byProvider[p] > 0 ? "default" : "muted"}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.table.heading}
        </h2>
        {report.totals.count === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t.export.empty}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-3xl border border-border/60">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tr.table.date}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.deposit}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.installment}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.topup}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.total}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.daily
                  .slice()
                  .reverse()
                  .map((row) => (
                    <tr key={row.dateKey}>
                      <td className="px-4 py-2.5 font-mono text-[12px]">
                        {formatDate(row.dateKey, locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {formatTzs(row.deposit, locale)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {formatTzs(row.installment, locale)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {formatTzs(row.topup, locale)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {formatTzs(row.total, locale)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
