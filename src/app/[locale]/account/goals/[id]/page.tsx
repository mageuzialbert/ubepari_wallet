import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { GoalActions } from "@/components/goals/goal-actions";
import { GoalProgressRing } from "@/components/goals/goal-progress-ring";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getGoalDetail } from "@/lib/goals";
import { getProduct } from "@/lib/products";
import { getSession } from "@/lib/session";
import { hasLocale } from "@/i18n/config";

import { getDictionary } from "../../../dictionaries";

type PageParams = Promise<{ locale: string; id: string }>;

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

export default async function GoalDetailPage({ params }: { params: PageParams }) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const dict = await getDictionary(locale);
  const t = dict.goals;

  const detail = await getGoalDetail(session.claims.userId, id);
  if (!detail) notFound();
  const { goal, contributions } = detail;
  const product = await getProduct(goal.product_slug, locale);
  const productName = product?.name ?? goal.product_slug;

  const percent = Math.min(
    100,
    Math.round((goal.contributed_tzs / goal.product_price_tzs) * 100),
  );
  const remaining = Math.max(
    0,
    goal.product_price_tzs - goal.contributed_tzs,
  );
  const suggestedAmount = Math.min(goal.monthly_target_tzs, remaining || goal.monthly_target_tzs);

  const startedOn = t.startedOn.replace(
    "{date}",
    formatDate(goal.created_at, locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-16 sm:px-6">
      <Link
        href={`/${locale}/account/goals`}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.back}
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center">
          <GoalProgressRing
            percent={percent}
            label={`${percent}%`}
            sublabel={
              goal.status === "completed"
                ? t.statusLabel.completed
                : goal.status === "cancelled"
                  ? t.statusLabel.cancelled
                  : t.progressPercent.replace("{percent}", String(percent))
            }
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {goal.reference}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {productName}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{startedOn}</p>

          <dl className="mt-6 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
            <Row label={t.targetPrice} value={formatTzs(goal.product_price_tzs, locale)} />
            <Row label={t.contributed} value={formatTzs(goal.contributed_tzs, locale)} />
            <Row label={t.monthlyTarget} value={formatTzs(goal.monthly_target_tzs, locale)} />
            <Row
              label={t.targetMonthsLabel}
              value={`${goal.target_months} ${dict.goal.monthsSuffix}`}
            />
            {goal.next_reminder_date && goal.status === "active" && (
              <Row
                label={t.nextReminder}
                value={formatDate(goal.next_reminder_date, locale, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
            )}
            {goal.receipt_number && (
              <Row
                label={t.receiptNumberLabel}
                value={goal.receipt_number}
                emphasize
              />
            )}
          </dl>

          <GoalActions
            goalId={goal.id}
            productName={productName}
            suggestedAmount={suggestedAmount}
            isActive={goal.status === "active"}
            isCompleted={goal.status === "completed"}
            receiptHref={
              goal.status === "completed"
                ? `/api/goals/${goal.id}/receipt.pdf`
                : undefined
            }
          />

          {goal.status === "completed" && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              {t.pickUpAtShowroom}
            </p>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          {t.contributionsHeading}
        </h2>
        {contributions.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border/60 bg-card p-8 text-center text-[13px] text-muted-foreground">
            {t.contributionsEmpty}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
            {contributions.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 p-5 text-[13px]"
              >
                <div>
                  <p className="font-medium">
                    {formatTzs(c.amount_tzs, locale)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {formatDate(c.created_at, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {c.provider}
                    {c.evmark_reference_id ? ` · ${c.evmark_reference_id}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    c.status === "success"
                      ? "bg-foreground text-background"
                      : c.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.statusLabel[c.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasize
            ? "font-semibold tracking-tight text-foreground"
            : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
