import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  return { title: dict.account.export.metaTitle };
}

export default async function ExportAccountPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const dict = await getDictionary(locale);
  const t = dict.account.export;

  return (
    <div className="mx-auto max-w-xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <Link
        href={`/${locale}/account`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t.back}
      </Link>

      <header className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {t.lede}
        </p>
      </header>

      <section className="mt-10 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.contentsTitle}
        </h2>
        <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-muted-foreground">
          <li>• {t.contents.profile}</li>
          <li>• {t.contents.orders}</li>
          <li>• {t.contents.installments}</li>
          <li>• {t.contents.payments}</li>
          <li>• {t.contents.wallet}</li>
          <li>• {t.contents.kyc}</li>
        </ul>
        <p className="mt-6 text-[12px] text-muted-foreground">{t.notExported}</p>
        <Button asChild size="lg" className="mt-6 rounded-full">
          <a href="/api/account/export" download>
            <Download className="h-4 w-4" />
            {t.download}
          </a>
        </Button>
      </section>
    </div>
  );
}
