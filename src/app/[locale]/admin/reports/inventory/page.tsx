import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";
import { formatTzs } from "@/lib/currency";
import { getInventoryReport } from "@/lib/reports";
import { Kpi } from "@/components/admin/kpi";
import { CsvLink } from "@/components/admin/reports/csv-link";
import { ReportsSubnav } from "@/components/admin/reports/subnav";
import { getDictionary } from "../../../dictionaries";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.reports.inventory.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminInventoryReportPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.admin.reports;
  const tr = t.inventory;

  const report = await getInventoryReport(locale);

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

      <ReportsSubnav locale={locale} active="inventory" labels={t.nav} />

      <div className="flex justify-end">
        <CsvLink href="/api/admin/reports/inventory/export" label={t.export.csv} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label={tr.kpi.products}
          value={report.productCount.toString()}
        />
        <Kpi
          label={tr.kpi.units}
          value={report.totalStockUnits.toString()}
        />
        <Kpi
          label={tr.kpi.lowStock}
          value={report.lowStockCount.toString()}
          tone={report.lowStockCount > 0 ? "warn" : "muted"}
        />
        <Kpi
          label={tr.kpi.value}
          value={formatTzs(report.inventoryValue, locale)}
          sublabel={tr.kpi.valueSublabel}
        />
      </section>

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {tr.table.heading}
        </h2>
        {report.rows.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">{tr.empty}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-3xl border border-border/60">
            <table className="min-w-full text-left text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{tr.table.product}</th>
                  <th className="px-4 py-3 font-medium">{tr.table.brand}</th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.price}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {tr.table.stock}
                  </th>
                  <th className="px-4 py-3 font-medium">{tr.table.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/${locale}/admin/products/${row.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.name}
                      </Link>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {row.slug}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.brand}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatTzs(row.cashPriceTzs, locale)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {row.stock}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.outOfStock ? (
                        <StatusPill tone="rose">{tr.status.outOfStock}</StatusPill>
                      ) : row.lowStock ? (
                        <StatusPill tone="amber">{tr.status.lowStock}</StatusPill>
                      ) : (
                        <StatusPill tone="emerald">{tr.status.ok}</StatusPill>
                      )}
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

function StatusPill({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : tone === "amber"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${cls}`}
    >
      {children}
    </span>
  );
}
