import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { LEGAL_VERSION } from "@/lib/legal";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

type LegalShared = Dictionary["legal"];

type LegalDoc = {
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  sections: Record<string, { title: string; body: string[] }>;
};

type RelatedKey = "terms" | "privacy" | "hirePurchase";

const RELATED_HREF: Record<RelatedKey, string> = {
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  hirePurchase: "/legal/hire-purchase-agreement",
};

export function LegalPage({
  doc,
  shared,
  locale,
  related,
}: {
  doc: LegalDoc;
  shared: LegalShared;
  locale: Locale;
  related: RelatedKey[];
}) {
  const lastUpdatedLine = shared.lastUpdated
    .replace("{date}", shared.lastUpdatedDate)
    .replace("{version}", LEGAL_VERSION);

  const sections = Object.entries(doc.sections);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      <Link
        href={`/${locale}`}
        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {shared.backToHome}
      </Link>

      <header className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {shared.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {doc.heading}
        </h1>
        <p className="mt-4 text-[12px] text-muted-foreground">
          {lastUpdatedLine}
        </p>
        <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
          {doc.intro}
        </p>
      </header>

      <nav
        aria-label={shared.toc}
        className="mt-10 rounded-3xl border border-border/60 bg-card p-6"
      >
        <h2 className="text-[11px] font-semibold uppercase tracking-wider">
          {shared.toc}
        </h2>
        <ol className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {sections.map(([key, s]) => (
            <li key={key}>
              <a
                href={`#${key}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-10">
        {sections.map(([key, s]) => (
          <section key={key} id={key} className="scroll-mt-24">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {s.title}
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              {s.body.map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-[12px] italic text-muted-foreground">
        {shared.controllingVersion}
      </p>

      {related.length > 0 && (
        <aside className="mt-12">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {shared.relatedHeading}
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2 text-[14px]">
            {related.map((key) => (
              <li key={key}>
                <Link
                  href={`/${locale}${RELATED_HREF[key]}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 transition-colors hover:border-border hover:text-foreground"
                >
                  {shared.relatedLinks[key]}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    strokeWidth={1.8}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <aside className="mt-12 rounded-3xl border border-border/60 bg-card p-6">
        <h3 className="text-lg font-semibold tracking-tight">
          {shared.contactBlock.title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {shared.contactBlock.body}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-5 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">
              {shared.contactBlock.emailLabel}
            </dt>
            <dd className="mt-1">
              <a
                className="underline-offset-2 hover:underline"
                href={`mailto:${shared.contactBlock.emailValue}`}
              >
                {shared.contactBlock.emailValue}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {shared.contactBlock.phoneLabel}
            </dt>
            <dd className="mt-1">
              <a
                className="underline-offset-2 hover:underline"
                href={`tel:${shared.contactBlock.phoneValue.replace(/\s/g, "")}`}
              >
                {shared.contactBlock.phoneValue}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {shared.contactBlock.whatsappLabel}
            </dt>
            <dd className="mt-1">
              <a
                className="underline-offset-2 hover:underline"
                href={shared.contactBlock.whatsappHref}
              >
                {shared.contactBlock.whatsappValue}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {shared.contactBlock.hqLabel}
            </dt>
            <dd className="mt-1">{shared.contactBlock.hqValue}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">
              {shared.contactBlock.shopLabel}
            </dt>
            <dd className="mt-1">{shared.contactBlock.shopValue}</dd>
          </div>
        </dl>
      </aside>
    </article>
  );
}
