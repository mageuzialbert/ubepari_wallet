import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActiveGoalCard } from "@/components/goals/active-goal-card";
import { VestedPhoto } from "@/components/goals/vested-photo";
import { Button } from "@/components/ui/button";
import { listGoalsForUser } from "@/lib/goals";
import { getProductsBySlugs } from "@/lib/products";
import { getSession } from "@/lib/session";
import { getWalletBalance } from "@/lib/wallet";
import { hasLocale } from "@/i18n/config";

import { getDictionary } from "../../dictionaries";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.goals.metaTitle };
}

export default async function GoalsPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const dict = await getDictionary(locale);
  const t = dict.goals;

  const [goals, wallet] = await Promise.all([
    listGoalsForUser(session.claims.userId),
    getWalletBalance(session.claims.userId),
  ]);
  const productMap = await getProductsBySlugs(
    Array.from(new Set(goals.map((g) => g.product_slug))),
    locale,
  );

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const cancelled = goals.filter((g) => g.status === "cancelled");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.heading}
          </h1>
          <p className="mt-2 max-w-md text-[15px] text-muted-foreground">
            {t.subheading}
          </p>
        </div>
        <Button asChild className="rounded-full" size="lg">
          <Link href={`/${locale}/store`}>{t.browseStore}</Link>
        </Button>
      </header>

      {goals.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-lg font-semibold tracking-tight">{t.emptyTitle}</p>
          <p className="mt-2 text-[14px] text-muted-foreground">{t.emptyBody}</p>
          <Button asChild className="mt-6 rounded-full">
            <Link href={`/${locale}/store`}>{t.browseStore}</Link>
          </Button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <Section title={t.tabActive}>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {active.map((goal) => {
                  const product = productMap.get(goal.product_slug);
                  return (
                    <ActiveGoalCard
                      key={goal.id}
                      goalId={goal.id}
                      reference={goal.reference}
                      productName={product?.name ?? goal.product_slug}
                      productImage={product?.images[0]}
                      productColorAccent={product?.colorAccent ?? null}
                      productPriceTzs={goal.product_price_tzs}
                      contributedTzs={goal.contributed_tzs}
                      monthlyTargetTzs={goal.monthly_target_tzs}
                      availableTzs={wallet.availableTzs}
                    />
                  );
                })}
              </div>
            </Section>
          )}

          {completed.length > 0 && (
            <Section title={t.tabCompleted}>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {completed.map((goal) => {
                  const product = productMap.get(goal.product_slug);
                  const productName = product?.name ?? goal.product_slug;
                  return (
                    <Link
                      key={goal.id}
                      href={`/${locale}/account/goals/${goal.id}`}
                      className="block overflow-hidden rounded-3xl border border-border/60 bg-card transition-colors hover:border-border"
                    >
                      <VestedPhoto
                        imageUrl={product?.images[0]}
                        alt={productName}
                        percent={100}
                        colorAccent={product?.colorAccent ?? null}
                        state="completed"
                        aspect="5/3"
                      >
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                              {goal.reference}
                            </p>
                            <p className="mt-1 truncate text-[17px] font-semibold tracking-tight">
                              {productName}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md">
                            {t.statusLabel.completed}
                          </span>
                        </div>
                      </VestedPhoto>
                      {goal.receipt_number && (
                        <p className="px-5 py-4 text-[12px] text-muted-foreground">
                          {t.receiptNumberLabel}: {goal.receipt_number}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}

          {cancelled.length > 0 && (
            <Section title={t.tabCancelled}>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {cancelled.map((goal) => {
                  const product = productMap.get(goal.product_slug);
                  const productName = product?.name ?? goal.product_slug;
                  return (
                    <Link
                      key={goal.id}
                      href={`/${locale}/account/goals/${goal.id}`}
                      className="block overflow-hidden rounded-3xl border border-border/60 bg-card/50 transition-colors hover:border-border"
                    >
                      <VestedPhoto
                        imageUrl={product?.images[0]}
                        alt={productName}
                        percent={0}
                        state="cancelled"
                        aspect="5/3"
                      >
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                            {goal.reference} · {t.statusLabel.cancelled}
                          </p>
                          <p className="mt-1 truncate text-[17px] font-semibold tracking-tight text-white/85">
                            {productName}
                          </p>
                        </div>
                      </VestedPhoto>
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
