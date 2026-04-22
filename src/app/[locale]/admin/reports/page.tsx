import { redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";

type PageParams = Promise<{ locale: string }>;

export default async function ReportsIndexPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  redirect(`/${locale}/admin/reports/revenue`);
}
