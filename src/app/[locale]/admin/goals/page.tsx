import type { Metadata } from "next";
import Link from "next/link";

import { Progress } from "@/components/ui/progress";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getProductsBySlugs } from "@/lib/products";
import { requireAdminPage } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GoalStatus, GoalsRow } from "@/lib/supabase/types";
import { hasLocale, type Locale } from "@/i18n/config";

import { getDictionary } from "../../dictionaries";

const TABS = ["all", "active", "completed", "cancelled"] as const;
type TabKey = (typeof TABS)[number];

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ status?: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Admin goals", robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminGoalsPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const typedLocale = locale as Locale;
  await requireAdminPage(typedLocale);
  const dict = await getDictionary(typedLocale);

  const sp = await searchParams;
  const status: TabKey = (TABS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as TabKey)
    : "all";

  const admin = supabaseAdmin();
  let query = admin
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status as GoalStatus);
  const { data: goals } = await query;
  const list = (goals ?? []) as GoalsRow[];

  const userIds = Array.from(new Set(list.map((g) => g.user_id)));
  const slugs = Array.from(new Set(list.map((g) => g.product_slug)));
  const [{ data: profiles }, productMap] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("id, first_name, last_name, phone").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null }> }),
    getProductsBySlugs(slugs, typedLocale),
  ]);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p] as const),
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        All layaway goals across customers — filter, inspect, or cancel.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-[12px]">
        {TABS.map((t) => (
          <Link
            key={t}
            href={t === "all" ? "?" : `?status=${t}`}
            className={`rounded-full border px-3 py-1 font-medium transition-colors ${
              status === t
                ? "border-foreground bg-foreground text-background"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all"
              ? "All"
              : t === "active"
                ? dict.goals.statusLabel.active
                : t === "completed"
                  ? dict.goals.statusLabel.completed
                  : dict.goals.statusLabel.cancelled}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border/60 bg-card p-8 text-center text-[13px] text-muted-foreground">
          No goals match this filter.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
          {list.map((g) => {
            const profile = profileMap.get(g.user_id);
            const product = productMap.get(g.product_slug);
            const percent = Math.min(
              100,
              Math.round((g.contributed_tzs / g.product_price_tzs) * 100),
            );
            return (
              <li key={g.id} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">{g.reference}</p>
                  <p className="mt-0.5 text-[14px] font-semibold tracking-tight">
                    {product?.name ?? g.product_slug}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {profile
                      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
                        profile.phone ||
                        "—"
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatTzs(g.contributed_tzs, typedLocale)} /{" "}
                    {formatTzs(g.product_price_tzs, typedLocale)}
                  </p>
                  <Progress value={percent} className="mt-1.5 h-1.5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {dict.goals.statusLabel[g.status]}
                  </p>
                  <p className="mt-0.5 text-[12px]">
                    {formatDate(g.created_at, typedLocale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  {g.receipt_number && (
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">
                      {g.receipt_number}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
