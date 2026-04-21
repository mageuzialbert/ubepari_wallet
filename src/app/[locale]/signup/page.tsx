import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

      <form className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first">{t.firstName}</Label>
            <Input id="first" className="mt-2" />
          </div>
          <div>
            <Label htmlFor="last">{t.lastName}</Label>
            <Input id="last" className="mt-2" />
          </div>
        </div>
        <div>
          <Label htmlFor="phone">{t.phoneLabel}</Label>
          <Input
            id="phone"
            placeholder={t.phonePlaceholder}
            className="mt-2"
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="email">{t.emailLabel}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t.emailPlaceholder}
            className="mt-2"
            autoComplete="email"
          />
        </div>
        <Button className="w-full rounded-full" size="lg">
          {t.submit}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          {t.tosPrefix}
          <Link href={`/${locale}/legal/terms`} className="underline underline-offset-2">
            {t.tosTerms}
          </Link>
          {t.tosAnd}
          <Link
            href={`/${locale}/legal/hire-purchase`}
            className="underline underline-offset-2"
          >
            {t.tosHirePurchase}
          </Link>
          {t.tosSuffix}
        </p>
      </form>

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
