import type { Metadata } from "next";

import { hasLocale } from "@/i18n/config";
import { formatDate } from "@/lib/datetime";
import { getKycReport } from "@/lib/reports";
import {
  DEFAULT_RANGE,
  parseRangeFromSearchParams,
} from "@/lib/reports-range";
import { Kpi } from "@/components/admin/kpi";
import { CsvLink } from "@/components/admin/reports/csv-link";
import { KycChart } from "@/components/admin/reports/kyc-chart";
import { RangeTabs } from "@/components/admin/reports/range-tabs";
import { ReportsSubnav } from "@/components/admin/reports/subnav";
import { getDictionary } from "../../../dictionaries";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ range?: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.reports.kyc.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminKycReportPage({
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
  const tr = t.kyc;

  const report = await getKycReport(range);
  const exportHref = `/api/admin/reports/kyc/export?range=${range.key}`;

  const approvalRatePct =
    report.approvalRate === null
      ? "—"
      : `${Math.round(report.approvalRate * 100)}%`;
  const medianHoursLabel =
    report.medianHoursToReview === null
      ? "—"
      : tr.hoursValue.replace(
          "{n}",
          report.medianHoursToReview < 10
            ? report.medianHoursToReview.toFixed(1)
            : String(Math.round(report.medianHoursToReview)),
        );

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
        active="kyc"
        labels={t.nav}
        query={{ range: range.key !== DEFAULT_RANGE ? range.key : undefined }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeTabs
          locale={locale}
          basePath="admin/reports/kyc"
          active={range.key}
          labels={t.range}
        />
        <CsvLink href={exportHref} label={t.export.csv} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label={tr.kpi.submissions}
          value={report.totals.submitted.toString()}
        />
        <Kpi
          label={tr.kpi.approvalRate}
          value={approvalRatePct}
          sublabel={tr.kpi.approvalRateSub
            .replace("{a}", String(report.totals.approved))
            .replace("{r}", String(report.totals.rejected))}
        />
        <Kpi
          label={tr.kpi.medianHours}
          value={medianHoursLabel}
        />
        <Kpi
          label={tr.kpi.pending}
          value={report.totals.pendingAll.toString()}
          sublabel={tr.kpi.pendingSub}
          tone={report.totals.pendingAll > 0 ? "accent" : "muted"}
        />
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.chart.heading}
        </h2>
        <div className="mt-4">
          {report.totals.submitted === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              {t.export.empty}
            </p>
          ) : (
            <KycChart
              data={report.weeks}
              labels={{
                approved: tr.chart.approved,
                rejected: tr.chart.rejected,
                pending: tr.chart.pending,
              }}
              locale={locale}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.table.heading}
        </h2>
        {report.totals.submitted === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {t.export.empty}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-3xl border border-border/60">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tr.table.week}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.submitted}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.approved}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.rejected}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.pending}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.weeks
                  .slice()
                  .reverse()
                  .map((row) => (
                    <tr key={row.weekStart}>
                      <td className="px-4 py-2.5 font-mono text-[12px]">
                        {formatDate(row.weekStart, locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right">{row.submitted}</td>
                      <td className="px-4 py-2.5 text-right">{row.approved}</td>
                      <td className="px-4 py-2.5 text-right">{row.rejected}</td>
                      <td className="px-4 py-2.5 text-right">{row.pending}</td>
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
