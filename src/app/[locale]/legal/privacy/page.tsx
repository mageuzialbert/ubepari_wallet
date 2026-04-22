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
    title: dict.legal.privacy.metaTitle,
    description: dict.legal.privacy.metaDescription,
  };
}

export default async function PrivacyPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);

  return (
    <LegalPage
      doc={dict.legal.privacy}
      shared={dict.legal}
      locale={locale}
      related={["terms", "hirePurchase"]}
    />
  );
}
