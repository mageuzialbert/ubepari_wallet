import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
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
  return {
    title: dict.legal.hirePurchase.metaTitle,
    description: dict.legal.hirePurchase.metaDescription,
  };
}

export default async function HirePurchaseAgreementPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <LegalPage
      doc={dict.legal.hirePurchase}
      shared={dict.legal}
      locale={locale}
      related={["terms", "privacy"]}
    />
  );
}
