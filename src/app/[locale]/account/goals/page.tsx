import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { listGoalsForUser } from "@/lib/goals";
import { getProductsBySlugs } from "@/lib/products";
import { getSession } from "@/lib/session";
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

  const goals = await listGoalsForUser(session.claims.userId);
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
                  const percent = Math.min(
                    100,
                    Math.round(
                      (goal.contributed_tzs / goal.product_price_tzs) * 100,
                    ),
                  );
                  return (
                    <Link
                      key={goal.id}
                      href={`/${locale}/account/goals/${goal.id}`}
                      className="block rounded-3xl border border-border/60 bg-card p-5 transition-colors hover:border-border"
                    >
                      <p className="text-[11px] text-muted-foreground">
                        {goal.reference}
                      </p>
                      <p className="mt-1 text-[16px] font-semibold tracking-tight">
                        {product?.name ?? goal.product_slug}
                      </p>
                      <div className="mt-5">
                        <div className="flex justify-between text-[12px] text-muted-foreground">
                          <span>
                            {formatTzs(goal.contributed_tzs, locale)} / {formatTzs(goal.product_price_tzs, locale)}
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <Progress value={percent} className="mt-2 h-1.5" />
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
                        <span>
                          {t.monthlyTarget}: {formatTzs(goal.monthly_target_tzs, locale)}
                        </span>
                        {goal.next_reminder_date && (
                          <span>
                            {t.nextReminder}:{" "}
                            {formatDate(goal.next_reminder_date, locale, {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                    </Link>
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
                  return (
                    <Link
                      key={goal.id}
                      href={`/${locale}/account/goals/${goal.id}`}
                      className="block rounded-3xl border border-border/60 bg-card p-5 transition-colors hover:border-border"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">
                          {goal.reference}
                        </p>
                        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                          {t.statusLabel.completed}
                        </span>
                      </div>
                      <p className="mt-1 text-[16px] font-semibold tracking-tight">
                        {product?.name ?? goal.product_slug}
                      </p>
                      {goal.receipt_number && (
                        <p className="mt-3 text-[11px] text-muted-foreground">
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
                  return (
                    <Link
                      key={goal.id}
                      href={`/${locale}/account/goals/${goal.id}`}
                      className="block rounded-3xl border border-border/60 bg-card/50 p-5 transition-colors hover:border-border"
                    >
                      <p className="text-[11px] text-muted-foreground">
                        {goal.reference} · {t.statusLabel.cancelled}
                      </p>
                      <p className="mt-1 text-[16px] font-semibold tracking-tight text-muted-foreground">
                        {product?.name ?? goal.product_slug}
                      </p>
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
