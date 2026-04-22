import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../../dictionaries";

type LayoutParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export default async function ReportsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LayoutParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  await getDictionary(locale); // ensure dict imports once for nested pages
  return <div className="flex flex-col gap-8">{children}</div>;
}
