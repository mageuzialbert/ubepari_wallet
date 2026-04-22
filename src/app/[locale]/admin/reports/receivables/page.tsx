import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import { getReceivablesReport, type ReceivablesBucket } from "@/lib/reports";
import { Kpi } from "@/components/admin/kpi";
import { CsvLink } from "@/components/admin/reports/csv-link";
import { ReportsSubnav } from "@/components/admin/reports/subnav";
import { getDictionary } from "../../../dictionaries";

type PageParams = Promise<{ locale: string }>;

const BUCKETS: ReceivablesBucket[] = [
  "current",
  "d0_30",
  "d31_60",
  "d61_90",
  "d90_plus",
];

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.reports.receivables.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminReceivablesReportPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.admin.reports;
  const tr = t.receivables;

  const report = await getReceivablesReport();

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

      <ReportsSubnav locale={locale} active="receivables" labels={t.nav} />

      <div className="flex justify-end">
        <CsvLink href="/api/admin/reports/receivables/export" label={t.export.csv} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi
          label={tr.kpi.total}
          value={formatTzs(report.totalOutstanding, locale)}
        />
        <Kpi
          label={tr.kpi.orders}
          value={report.orderCount.toString()}
          sublabel={tr.kpi.ordersSublabel}
        />
        <Kpi
          label={tr.kpi.overdue}
          value={report.overdueOrderCount.toString()}
          tone={report.overdueOrderCount > 0 ? "warn" : "muted"}
        />
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.bucketsHeading}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BUCKETS.map((b) => (
            <Kpi
              key={b}
              label={tr.buckets[b]}
              value={formatTzs(report.bucketTotals[b], locale)}
              sublabel={tr.countLabel.replace(
                "{n}",
                String(report.bucketCounts[b]),
              )}
              tone={
                b === "current"
                  ? "muted"
                  : report.bucketTotals[b] > 0
                    ? "warn"
                    : "muted"
              }
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.table.heading}
        </h2>
        {report.rows.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            {tr.empty}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-3xl border border-border/60">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tr.table.reference}</th>
                  <th className="px-4 py-3 font-medium">{tr.table.user}</th>
                  <th className="px-4 py-3 font-medium">{tr.table.nextDue}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.overdueDays}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.balance}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.rows.map((row) => (
                  <tr key={row.orderId}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/${locale}/admin/orders/${row.orderId}`}
                        className="font-mono text-[12px] hover:underline"
                      >
                        {row.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="truncate">{row.userName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        +{row.userPhone}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">
                      {row.nextDueDate
                        ? formatDate(row.nextDueDate, locale, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.oldestOverdueDays > 0 ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-400">
                          {tr.table.daysSuffix.replace(
                            "{n}",
                            String(row.oldestOverdueDays),
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatTzs(row.balance, locale)}
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
