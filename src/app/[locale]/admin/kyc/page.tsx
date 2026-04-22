import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { listAdminKycSubmissions } from "@/lib/admin/kyc-data";
import { formatDate } from "@/lib/datetime";
import { maskNida } from "@/lib/pii";
import { getDictionary } from "../../dictionaries";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ status?: string }>;

type ReviewableStatus = "pending" | "approved" | "rejected";
const TABS: readonly ReviewableStatus[] = ["pending", "approved", "rejected"] as const;
const LIST_LIMIT = 100;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.kyc.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminKycListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const sp = await searchParams;
  const status: ReviewableStatus = (TABS as readonly string[]).includes(
    sp.status ?? "",
  )
    ? (sp.status as ReviewableStatus)
    : "pending";

  const dict = await getDictionary(locale);
  const t = dict.admin.kyc;
  const submissions = await listAdminKycSubmissions(status);

  return (
    <div className="flex flex-col gap-8">
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

      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab === status;
          return (
            <Link
              key={tab}
              href={`/${locale}/admin/kyc?status=${tab}`}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "border border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.tabs[tab]}
            </Link>
          );
        })}
      </nav>

      {submissions.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-10 text-center text-[14px] text-muted-foreground">
          {t.empty[status]}
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60">
          {submissions.map((row) => {
            const dateLabel =
              status === "pending" || !row.reviewed_at
                ? formatDate(row.submitted_at, locale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : formatDate(row.reviewed_at, locale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
            return (
              <li key={row.id}>
                <Link
                  href={`/${locale}/admin/kyc/${row.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">
                      {row.legal_first_name} {row.legal_last_name}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {dateLabel}
                    </p>
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="font-mono text-[12px] text-muted-foreground">
                      {maskNida(row.nida_number)}
                    </p>
                    {row.workplace ? (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                        {row.workplace}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {submissions.length >= LIST_LIMIT ? (
        <p className="text-[11px] text-muted-foreground">
          {t.limitNotice.replace("{n}", String(LIST_LIMIT))}
        </p>
      ) : null}
    </div>
  );
}
