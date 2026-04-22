import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../../dictionaries";
import { AccountEditForm } from "./account-edit-form";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.account.edit.metaTitle };
}

export default async function AccountEditPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const { client, userId, phone } = await requireSupabaseForUser();
  const { data: profile } = await client
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", userId)
    .maybeSingle();

  const dict = await getDictionary(locale);
  const t = dict.account.edit;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <Link
        href={`/${locale}/account`}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t.back}
      </Link>

      <header className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          {t.subheading}
        </p>
      </header>

      <div className="mt-10">
        <AccountEditForm
          initial={{
            firstName: profile?.first_name ?? "",
            lastName: profile?.last_name ?? "",
            email: profile?.email ?? "",
            phone,
          }}
        />
      </div>
    </div>
  );
}
