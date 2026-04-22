import Link from "next/link";

import type { Locale } from "@/i18n/config";

export type ReportTab = "revenue" | "receivables" | "inventory" | "kyc";

const TABS: ReportTab[] = ["revenue", "receivables", "inventory", "kyc"];

type Labels = Record<ReportTab, string>;

export function ReportsSubnav({
  locale,
  active,
  labels,
  query,
}: {
  locale: Locale;
  active: ReportTab;
  labels: Labels;
  query?: Record<string, string | undefined>;
}) {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={`/${locale}/admin/reports/${tab}${suffix}`}
            className={`rounded-full px-4 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "border border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
