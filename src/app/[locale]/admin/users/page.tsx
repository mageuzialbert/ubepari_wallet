import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { listAdminUsers } from "@/lib/admin/users";
import { isRootAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/datetime";
import { formatTzs } from "@/lib/currency";
import { getDictionary } from "../../dictionaries";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.users.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminUsersListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const dict = await getDictionary(locale);
  const t = dict.admin.users;
  const users = await listAdminUsers({ search: q });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h1>
        <p className="mt-3 max-w-xl text-[14px] text-muted-foreground">{t.body}</p>
      </header>

      <form method="GET" action={`/${locale}/admin/users`} className="flex items-center gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder={t.list.searchPlaceholder}
          className="flex-1 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
        />
        <button type="submit" className="sr-only">
          {t.list.searchPlaceholder}
        </button>
      </form>

      {users.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-10 text-center text-[14px] text-muted-foreground">
          {t.list.empty}
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60">
          {users.map((row) => {
            const displayName =
              [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.phone;
            const isRoot = isRootAdmin(row.phone);
            const joined = formatDate(row.created_at, locale, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            return (
              <li key={row.id}>
                <Link
                  href={`/${locale}/admin/users/${row.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-medium">{displayName}</p>
                      {isRoot ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-300">
                          {t.list.rootBadge}
                        </span>
                      ) : row.is_admin ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                          {t.list.adminBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      +{row.phone}
                      {row.email ? ` · ${row.email}` : ""}
                    </p>
                  </div>
                  <div className="hidden min-w-0 shrink-0 text-right sm:block">
                    <p className="text-[13px] font-medium">
                      {formatTzs(row.credit_limit_tzs, locale)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.orders_count} · {t.list.columns.orders}
                    </p>
                  </div>
                  <KycPill status={row.kyc_status} labels={t.detail.kycStatus} />
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:block">
                    {joined}
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

function KycPill({
  status,
  labels,
}: {
  status: "none" | "pending" | "approved" | "rejected";
  labels: { none: string; pending: string; approved: string; rejected: string };
}) {
  const tone =
    status === "approved"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "pending"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : status === "rejected"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-border/60 text-muted-foreground";
  return (
    <span
      className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] sm:inline-flex ${tone}`}
    >
      {labels[status]}
    </span>
  );
}
