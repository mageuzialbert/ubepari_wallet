import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Check, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PayInstallmentDialog } from "@/components/wallet/pay-installment-dialog";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import { getOrdersSnapshot } from "@/lib/wallet-data";
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
  return { title: dict.orders.metaTitle };
}

export default async function OrdersPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const { client, userId } = await requireSupabaseForUser();
  const snapshot = await getOrdersSnapshot(client, userId, locale);

  const dict = await getDictionary(locale);
  const t = dict.orders;

  const statusLabel = (s: string) =>
    s === "pending"
      ? t.statusPending
      : s === "active"
        ? t.statusActive
        : s === "completed"
          ? t.statusCompleted
          : t.statusCancelled;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
      </header>

      <div className="mt-10 space-y-10">
        {snapshot.orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card p-10 text-center">
            <p className="text-[17px] font-semibold">{t.emptyTitle}</p>
            <p className="mt-2 text-[14px] text-muted-foreground">{t.emptyBody}</p>
            <Button asChild className="mt-6 rounded-full">
              <Link href={`/${locale}/store`}>{t.browseStoreLink}</Link>
            </Button>
          </div>
        ) : (
          snapshot.orders.map((o) => {
            const progress =
              o.termMonths > 0 ? Math.round((o.monthsPaid / o.termMonths) * 100) : 0;
            const nextUnpaid = o.installments.find((i) => i.paidAt === null);
            return (
              <section
                key={o.id}
                className="overflow-hidden rounded-3xl border border-border/60 bg-card"
              >
                <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                  {o.productImage && (
                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-border/60">
                      <Image
                        src={o.productImage}
                        alt={o.productName}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {o.reference} · {t.hirePurchaseLabel} · {statusLabel(o.status)}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      {o.productName}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
                      <span>
                        {t.principal.replace(
                          "{amount}",
                          formatTzs(o.principalTzs, locale),
                        )}
                      </span>
                      <span>
                        {t.paidOf
                          .replace("{paid}", formatTzs(o.paidTzs, locale))
                          .replace("{total}", formatTzs(o.principalTzs, locale))}
                      </span>
                      <span>
                        {t.monthly.replace(
                          "{amount}",
                          formatTzs(o.monthlyTzs, locale),
                        )}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Progress value={progress} className="h-1.5" />
                      <p className="mt-1.5 text-[12px] text-muted-foreground">
                        {t.progressHint
                          .replace("{pct}", String(progress))
                          .replace("{months}", String(o.termMonths - o.monthsPaid))}
                      </p>
                    </div>
                    {o.status === "active" && nextUnpaid && (
                      <div className="mt-4">
                        <PayInstallmentDialog
                          installmentId={nextUnpaid.id}
                          amountTzs={nextUnpaid.amountTzs}
                          trigger={
                            <Button className="rounded-full" size="sm">
                              {t.payNow} · {formatTzs(nextUnpaid.amountTzs, locale)}
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/60 p-6 sm:p-8">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {t.scheduleLabel}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {o.installments.map((s) => {
                      const paid = s.paidAt !== null;
                      const current = !paid && s.id === nextUnpaid?.id;
                      return (
                        <div
                          key={s.id}
                          className={`rounded-2xl border p-3 text-center text-[12px] ${
                            paid
                              ? "border-foreground bg-foreground text-background"
                              : current
                                ? "border-foreground/40 bg-foreground/5"
                                : "border-border/60 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
                            {paid ? (
                              <Check className="h-3 w-3" />
                            ) : current ? (
                              <Clock className="h-3 w-3" />
                            ) : null}
                            M{s.sequence}
                          </div>
                          <div className="mt-1 font-medium">
                            {formatDate(s.dueDate, locale, {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                          <div className="mt-0.5 text-[10px] opacity-70">
                            {formatTzs(s.amountTzs, locale).replace("TZS ", "")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })
        )}

        {snapshot.orders.length > 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 p-8 text-center">
            <p className="text-[14px] text-muted-foreground">
              {t.browseStorePrefix}
              <Link
                href={`/${locale}/store`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t.browseStoreLink}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
