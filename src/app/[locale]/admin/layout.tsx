import { hasLocale } from "@/i18n/config";
import { requireAdminPage } from "@/lib/auth/admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getDictionary } from "../dictionaries";

type AdminLayoutParams = Promise<{ locale: string }>;

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: AdminLayoutParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const admin = await requireAdminPage(locale);
  const dict = await getDictionary(locale);
  const t = dict.admin;

  const actorName =
    [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.phone;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 pt-10 pb-16 sm:px-6 md:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.shell.eyebrow}
          </p>
          <p className="mt-1 text-[13px] font-medium">{actorName}</p>
        </div>
        <AdminSidebar nav={t.nav} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
