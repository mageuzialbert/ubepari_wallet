import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
  return {
    title: dict.about.metaTitle,
    description: dict.about.metaDescription,
  };
}

export default async function AboutPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.about;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
          {t.heading}
        </h1>
        <p className="mt-6 text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
          {t.intro}
        </p>
      </header>

      <section className="mt-20 rounded-3xl border border-border/60 bg-card px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.mission.eyebrow}
        </p>
        <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.mission.body}
        </p>
      </section>

      <section className="mt-20 grid gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.story.heading}
        </h2>
        <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
          {t.story.paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.principles.heading}
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {t.principles.items.map((item) => (
            <li
              key={item.title}
              className="rounded-3xl border border-border/60 bg-card p-6"
            >
              <h3 className="text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.stats.heading}
        </h2>
        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {t.stats.items.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-border/60 bg-card p-6"
            >
              <dt className="sr-only">{item.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {item.value}
              </dd>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {item.label}
              </p>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.locations.heading}
        </h2>
        <dl className="mt-8 grid grid-cols-1 gap-5 text-[14px] sm:grid-cols-3">
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.locations.hq.label}
            </dt>
            <dd className="mt-2">{t.locations.hq.value}</dd>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.locations.shop.label}
            </dt>
            <dd className="mt-2">{t.locations.shop.value}</dd>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.locations.hours.label}
            </dt>
            <dd className="mt-2">{t.locations.hours.value}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-20 rounded-3xl border border-border/60 bg-card px-6 py-10 sm:px-10 sm:py-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.cta.heading}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {t.cta.body}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/store`}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
          >
            {t.cta.shop}
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <Link
            href={`/${locale}/support`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-5 py-2.5 text-[14px] font-medium transition-colors hover:border-border"
          >
            {t.cta.talk}
          </Link>
        </div>
      </section>
    </div>
  );
}
