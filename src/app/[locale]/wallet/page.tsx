import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TopUpDialog } from "@/components/wallet/top-up-dialog";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import { getWalletSnapshot } from "@/lib/wallet-data";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../dictionaries";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.wallet.metaTitle };
}

export default async function WalletPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const { client, userId } = await requireSupabaseForUser();
  const snapshot = await getWalletSnapshot(client, userId, locale);
  if (!snapshot) redirect(`/${locale}/signin`);

  const dict = await getDictionary(locale);
  const t = dict.wallet;
  const tNotes = t.activityNotes;

  const firstName = snapshot.profile.firstName ?? "";
  const greetingRaw = firstName ? t.greeting.replace("{name}", firstName) : t.emptyGreeting;

  const totalCycle = snapshot.balance.totalPaidTzs + snapshot.balance.totalOwedTzs;
  const paidPct =
    totalCycle > 0
      ? Math.round((snapshot.balance.totalPaidTzs / totalCycle) * 100)
      : 0;

  const limitSuffix = t.limitPrefix.replace(
    "{amount}",
    formatTzs(snapshot.profile.creditLimitTzs, locale),
  );

  const nextDueLine = snapshot.balance.nextDueDate
    ? t.nextDueBy.replace(
        "{date}",
        formatDate(snapshot.balance.nextDueDate, locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      )
    : null;

  const resolveNote = (noteKey: string, orderRef: string | undefined) => {
    const tpl = (tNotes as Record<string, string>)[noteKey];
    if (!tpl) return noteKey;
    return tpl.replace("{orderId}", orderRef ?? "");
  };

  const providerLabel = (p: string | null) => {
    if (!p) return "";
    if (p === "mpesa") return "M-Pesa";
    if (p === "tigopesa") return "Tigo Pesa";
    if (p === "airtelmoney") return "Airtel Money";
    if (p === "card") return "Card";
    return p;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {greetingRaw}
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 text-[12px]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="font-medium">
            {snapshot.profile.creditPoints} {t.pointsSuffix}
          </span>
          <span className="text-muted-foreground">{limitSuffix}</span>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/75 p-8 text-background">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
                {t.totalRemaining}
              </p>
              <p className="mt-2 text-5xl font-semibold tracking-tight">
                {formatTzs(snapshot.balance.totalOwedTzs, locale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
                {t.paidSoFar}
              </p>
              <p className="mt-2 text-xl font-medium opacity-90">
                {formatTzs(snapshot.balance.totalPaidTzs, locale)}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-[11px] opacity-70">
              <span>{t.ownershipProgress}</span>
              <span>{paidPct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/15">
              <div className="h-full bg-background" style={{ width: `${paidPct}%` }} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TopUpDialog
              trigger={
                <Button size="lg" variant="secondary" className="rounded-full px-5">
                  <Plus className="h-4 w-4" /> {t.topUp}
                </Button>
              }
            />
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-full px-5 text-background hover:bg-background/10 hover:text-background"
            >
              <Link href={`/${locale}/orders`}>{t.viewSchedule}</Link>
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.nextDue}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatTzs(snapshot.balance.nextDueTzs, locale)}
            </p>
            {nextDueLine && (
              <p className="mt-1 text-[13px] text-muted-foreground">{nextDueLine}</p>
            )}
          </div>

          <div className="flex-1 rounded-2xl bg-background/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.quickActions}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <TopUpDialog
                trigger={
                  <Button variant="outline" className="justify-start rounded-xl">
                    {t.topUp}
                  </Button>
                }
              />
              <Button
                asChild
                variant="outline"
                className="justify-start rounded-xl"
              >
                <Link href={`/${locale}/orders`}>{t.viewSchedule}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="justify-start rounded-xl"
              >
                <Link href={`/${locale}/store`}>{t.shopAnother}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">{t.activeOrders}</h2>
        {snapshot.activeOrders.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border/60 bg-card p-8 text-center">
            <p className="text-[15px] font-medium">{t.emptyOrdersTitle}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{t.emptyOrdersBody}</p>
            <Button asChild className="mt-4 rounded-full" size="sm">
              <Link href={`/${locale}/store`}>{t.browseStore}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {snapshot.activeOrders.map((o) => {
              const progress =
                o.termMonths > 0 ? Math.round((o.monthsPaid / o.termMonths) * 100) : 0;
              return (
                <Link
                  key={o.id}
                  href={`/${locale}/orders`}
                  className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 transition-colors hover:border-border sm:flex-row sm:items-center"
                >
                  {o.productImage && (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60">
                      <Image
                        src={o.productImage}
                        alt={o.productName}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{o.reference}</p>
                        <p className="mt-0.5 text-[15px] font-semibold">{o.productName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">{t.monthly}</p>
                        <p className="text-[14px] font-medium">
                          {formatTzs(o.monthlyTzs, locale)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          {t.monthsPaidOf
                            .replace("{paid}", String(o.monthsPaid))
                            .replace("{total}", String(o.termMonths))}
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="mt-1.5 h-1.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">{t.recentActivity}</h2>
        {snapshot.recentActivity.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border/60 bg-card p-8 text-center">
            <p className="text-[13px] text-muted-foreground">{t.emptyActivity}</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
            {snapshot.recentActivity.map((tx) => {
              const incoming = tx.kind === "credit";
              const orderRef =
                typeof tx.noteParams.orderId === "string" ? tx.noteParams.orderId : undefined;
              return (
                <li key={tx.id} className="flex items-center gap-4 p-5 text-[13px]">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      incoming
                        ? "bg-foreground/5 text-foreground"
                        : "bg-foreground text-background"
                    }`}
                  >
                    {incoming ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{resolveNote(tx.noteKey, orderRef)}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {[providerLabel(tx.provider), formatDate(tx.at, locale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        incoming ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {incoming ? "+" : "−"} {formatTzs(tx.amountTzs, locale)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
