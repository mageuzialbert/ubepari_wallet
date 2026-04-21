import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../dictionaries";
import { SignUpForm } from "./sign-up-form";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.signup.metaTitle };
}

export default async function SignUpPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.signup;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-sm flex-col justify-center px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t.heading}</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">{t.subtitle}</p>
      </div>

      <SignUpForm />

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        {t.alreadyHave}{" "}
        <Link
          href={`/${locale}/signin`}
          className="text-foreground underline-offset-4 hover:underline"
        >
          {t.signInLink}
        </Link>
      </p>
    </div>
  );
}
