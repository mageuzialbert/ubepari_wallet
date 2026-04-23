import { redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";

type PageParams = Promise<{ locale: string }>;

// Orders as a concept are retired post-layaway pivot. Existing rows stay
// inert in the DB; the UI folds everything into goals.
export default async function OrdersRedirect({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  redirect(`/${locale}/account/goals`);
}
