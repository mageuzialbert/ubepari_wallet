import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Check, Clock } from "lucide-react";

import { Progress } from "@/components/ui/progress";
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
  return { title: dict.orders.metaTitle };
}

export default async function OrdersPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.orders;

  const { activeOrders } = MOCK_WALLET;

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
        {activeOrders.map((o) => {
          const progress = Math.round((o.monthsPaid / o.termMonths) * 100);
          const schedule = Array.from({ length: o.termMonths }, (_, i) => {
            const dueDate = new Date("2025-11-05");
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            return {
              n: i + 1,
              dueDate,
              paid: i < o.monthsPaid,
              current: i === o.monthsPaid,
            };
          });

          return (
            <section
              key={o.id}
              className="overflow-hidden rounded-3xl border border-border/60 bg-card"
            >
              <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-border/60">
                  <Image
                    src={o.image}
                    alt={o.productName}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {o.id} · {t.hirePurchaseLabel}
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
                </div>
              </div>

              <div className="border-t border-border/60 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {t.scheduleLabel}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {schedule.map((s) => (
                    <div
                      key={s.n}
                      className={`rounded-2xl border p-3 text-center text-[12px] ${
                        s.paid
                          ? "border-foreground bg-foreground text-background"
                          : s.current
                            ? "border-foreground/40 bg-foreground/5"
                            : "border-border/60 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
                        {s.paid ? (
                          <Check className="h-3 w-3" />
                        ) : s.current ? (
                          <Clock className="h-3 w-3" />
                        ) : null}
                        M{s.n}
                      </div>
                      <div className="mt-1 font-medium">
                        {formatDate(s.dueDate, locale, {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                      <div className="mt-0.5 text-[10px] opacity-70">
                        {formatTzs(o.monthlyTzs, locale).replace("TZS ", "")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

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
      </div>
    </div>
  );
}
