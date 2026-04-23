import { permanentRedirect } from "next/navigation";

import { defaultLocale, hasLocale } from "@/i18n/config";

type PageParams = Promise<{ locale: string }>;

export default async function RecommendRedirect({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  const target = hasLocale(locale) ? locale : defaultLocale;
  permanentRedirect(`/${target}/assistant`);
}
