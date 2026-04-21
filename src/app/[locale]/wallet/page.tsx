import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TopUpDialog } from "@/components/wallet/top-up-dialog";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { MOCK_WALLET } from "@/lib/mock-wallet";
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
  const dict = await getDictionary(locale);
  const t = dict.wallet;

  const { user, balance, activeOrders, recentTransactions } = MOCK_WALLET;
  const paidPct = Math.round(
    (balance.totalPaidTzs / (balance.totalPaidTzs + balance.totalOwedTzs)) * 100,
  );

  const greeting = t.greeting.replace("{name}", user.name.split(" ")[0]);
  const limitSuffix = t.limitPrefix.replace(
    "{amount}",
    formatTzs(user.creditLimitTzs, locale),
  );
  const nextDueLine = t.nextDueBy.replace(
    "{date}",
    formatDate(balance.nextDueDate, locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  const resolveNote = (
    kind: typeof recentTransactions[number]["kind"],
    orderId?: string,
  ) =>
    t.activityNotes[kind].replace("{orderId}", orderId ?? "");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {greeting}
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 text-[12px]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="font-medium">
            {user.creditPoints} {t.pointsSuffix}
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
                {formatTzs(balance.totalOwedTzs, locale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
                {t.paidSoFar}
              </p>
              <p className="mt-2 text-xl font-medium opacity-90">
                {formatTzs(balance.totalPaidTzs, locale)}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-[11px] opacity-70">
              <span>{t.ownershipProgress}</span>
              <span>{paidPct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/15">
              <div
                className="h-full bg-background"
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TopUpDialog
              trigger={
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full px-5"
                >
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
              {formatTzs(balance.nextDueTzs, locale)}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">{nextDueLine}</p>
          </div>

          <div className="flex-1 rounded-2xl bg-background/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.quickActions}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <TopUpDialog
                trigger={
                  <Button
                    variant="outline"
                    className="justify-start rounded-xl"
                  >
                    {t.payThisMonth.replace(
                      "{amount}",
                      formatTzs(balance.nextDueTzs, locale),
                    )}
                  </Button>
                }
              />
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
        <div className="mt-4 flex flex-col gap-3">
          {activeOrders.map((o) => {
            const progress = Math.round((o.monthsPaid / o.termMonths) * 100);
            return (
              <Link
                key={o.id}
                href={`/${locale}/orders/${o.id}`}
                className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 transition-colors hover:border-border sm:flex-row sm:items-center"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60">
                  <Image
                    src={o.image}
                    alt={o.productName}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        {o.id}
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold">
                        {o.productName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">
                        {t.monthly}
                      </p>
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
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {t.recentActivity}
        </h2>
        <ul className="mt-4 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
          {recentTransactions.map((tx) => {
            const incoming = tx.kind === "topup" || tx.kind === "refund";
            return (
              <li
                key={tx.id}
                className="flex items-center gap-4 p-5 text-[13px]"
              >
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
                  <p className="font-medium">
                    {resolveNote(tx.kind, tx.orderId)}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {tx.provider} ·{" "}
                    {formatDate(tx.at, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
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
                  <p className="text-[11px] text-muted-foreground">{tx.id}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
