import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";

import { getSession } from "@/lib/session";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../../dictionaries";
import { DeleteAccountForm } from "./delete-form";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.account.delete.metaTitle };
}

export default async function DeleteAccountPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const dict = await getDictionary(locale);
  const t = dict.account.delete;

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          {t.lede}
        </p>
      </header>

      <section className="mt-10 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight">
              {t.warningTitle}
            </h2>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
              <li>• {t.warningBullets.anonymized}</li>
              <li>• {t.warningBullets.kycWiped}</li>
              <li>• {t.warningBullets.ordersKept}</li>
              <li>• {t.warningBullets.phoneFreed}</li>
              <li>• {t.warningBullets.irreversible}</li>
            </ul>
          </div>
        </div>
      </section>

      <DeleteAccountForm locale={locale} />
    </div>
  );
}
