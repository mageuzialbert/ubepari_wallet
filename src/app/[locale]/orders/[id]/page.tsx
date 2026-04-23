import { redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";

type PageParams = Promise<{ locale: string }>;

export default async function OrderDetailRedirect({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  redirect(`/${locale}/account/goals`);
}
