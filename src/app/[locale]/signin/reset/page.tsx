import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";

import { getDictionary } from "../../dictionaries";
import { PasswordResetForm } from "./password-reset-form";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.passwordReset.metaTitle };
}

export default async function PasswordResetPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.passwordReset;

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {dict.signin.heading}
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
        {t.heading}
      </h1>
      <p className="mt-3 text-[15px] text-muted-foreground">{t.body}</p>

      <PasswordResetForm />

      <p className="mt-6 text-center text-[13px]">
        <Link
          href={`/${locale}/signin`}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t.backToSignIn}
        </Link>
      </p>
    </div>
  );
}
