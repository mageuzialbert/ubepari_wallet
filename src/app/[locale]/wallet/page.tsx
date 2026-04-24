import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActivityList } from "@/components/wallet/activity-list";
import { BalanceCard } from "@/components/wallet/balance-card";
import { WalletActions } from "@/components/wallet/wallet-actions";
import { Button } from "@/components/ui/button";
import { listGoalsForUser } from "@/lib/goals";
import { getProductsBySlugs } from "@/lib/products";
import { getSession } from "@/lib/session";
import { getWalletBalance, listWalletEntries } from "@/lib/wallet";
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

  const dict = await getDictionary(locale);
  const t = dict.wallet;

  const [balance, entries, goals] = await Promise.all([
    getWalletBalance(session.claims.userId),
    listWalletEntries(session.claims.userId, 25),
    listGoalsForUser(session.claims.userId),
  ]);

  const activeGoals = goals.filter((g) => g.status === "active");
  // Product map covers every goal, so activity rows referencing completed /
  // cancelled goals still resolve a product name.
  const productMap = await getProductsBySlugs(
    Array.from(new Set(goals.map((g) => g.product_slug))),
    locale,
  );

  const goalLabelMap = new Map<string, string>(
    goals.map((g) => [g.id, productMap.get(g.product_slug)?.name ?? g.product_slug]),
  );

  const allocGoals = activeGoals.map((g) => ({
    id: g.id,
    reference: g.reference,
    productName: productMap.get(g.product_slug)?.name ?? g.product_slug,
    remainingTzs: Math.max(0, g.product_price_tzs - g.contributed_tzs),
  }));

  const isEmpty =
    balance.totalTzs === 0 && entries.length === 0 && activeGoals.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.metaTitle}
        </h1>
      </header>

      <section className="mt-8">
        <BalanceCard balance={balance} locale={locale} dict={t} />
        <WalletActions
          availableTzs={balance.availableTzs}
          activeGoals={allocGoals}
        />
      </section>

      {isEmpty ? (
        <section className="mt-12 rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-lg font-semibold tracking-tight">
            {t.emptyState.title}
          </p>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {t.emptyState.body}
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href={`/${locale}/store`}>{t.browseStore}</Link>
          </Button>
        </section>
      ) : (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            {t.recentActivity}
          </h2>
          <ActivityList
            entries={entries}
            dict={t}
            locale={locale}
            goalLabelMap={goalLabelMap}
          />
        </section>
      )}
    </div>
  );
}
