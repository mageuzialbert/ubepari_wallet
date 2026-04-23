import { redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";

type PageParams = Promise<{ locale: string }>;

// Wallet is now a thin alias for the goals page — the layaway pivot folds
// "balance" and "activity" back into per-goal views, so there's no standalone
// wallet surface to keep.
export default async function WalletPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  redirect(`/${locale}/account/goals`);
}
