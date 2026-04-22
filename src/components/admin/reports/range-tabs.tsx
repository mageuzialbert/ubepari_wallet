import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { RANGE_KEYS, type RangeKey } from "@/lib/reports-range";

type Labels = Record<RangeKey, string>;

export function RangeTabs({
  locale,
  basePath,
  active,
  labels,
}: {
  locale: Locale;
  basePath: string; // e.g. "admin/reports/revenue"
  active: RangeKey;
  labels: Labels;
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {RANGE_KEYS.map((key) => {
        const isActive = key === active;
        const qs = new URLSearchParams();
        qs.set("range", key);
        return (
          <Link
            key={key}
            href={`/${locale}/${basePath}?${qs.toString()}`}
            className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "border border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[key]}
          </Link>
        );
      })}
    </nav>
  );
}
