import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone, Mail, ArrowUpRight } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../dictionaries";

type PageParams = Promise<{ locale: string }>;

const CHANNEL_KEYS = ["whatsapp", "call", "email"] as const;

const CHANNEL_META: Record<
  (typeof CHANNEL_KEYS)[number],
  { icon: typeof MessageCircle; href: string }
> = {
  whatsapp: {
    icon: MessageCircle,
    href: "https://wa.me/255000000000?text=Hi%20Ubepari%2C%20I%20need%20help%20with%20my%20order",
  },
  call: { icon: Phone, href: "tel:+255000000000" },
  email: { icon: Mail, href: "mailto:support@ubepari.co.tz" },
};

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.support.metaTitle };
}

export default async function SupportPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.support;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        {CHANNEL_KEYS.map((key) => {
          const channel = t.channels[key];
          const meta = CHANNEL_META[key];
          const Icon = meta.icon;
          return (
            <Link
              key={key}
              href={meta.href}
              className="group rounded-3xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-sm"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <h3 className="mt-4 text-[15px] font-semibold">{channel.title}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {channel.description}
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium">
                {channel.cta}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </p>
            </Link>
          );
        })}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t.faqsHeading}
        </h2>
        <ul className="mt-6 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
          {t.faqs.map((f) => (
            <li key={f.q} className="p-6">
              <p className="font-medium">{f.q}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
