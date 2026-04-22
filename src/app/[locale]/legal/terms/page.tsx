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
    title: dict.legal.terms.metaTitle,
    description: dict.legal.terms.metaDescription,
  };
}

export default async function TermsPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <LegalPage
      doc={dict.legal.terms}
      shared={dict.legal}
      locale={locale}
      related={["privacy", "hirePurchase"]}
    />
  );
}
