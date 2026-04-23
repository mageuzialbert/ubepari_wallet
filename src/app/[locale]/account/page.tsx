import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Download, Pencil, ShieldAlert, ShieldCheck, ShieldX, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../dictionaries";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.account.metaTitle };
}

export default async function AccountPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const { client, userId, phone } = await requireSupabaseForUser();
  const { data: profile } = await client
    .from("profiles")
    .select(
      "first_name, last_name, email, kyc_status, credit_limit_tzs, credit_points, created_at",
    )
    .eq("id", userId)
    .maybeSingle();

  const dict = await getDictionary(locale);
  const t = dict.account;
  const kycStatus = (profile?.kyc_status ?? "none") as
    | "none"
    | "pending"
    | "approved"
    | "rejected";

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;

  const kycCard = (() => {
    switch (kycStatus) {
      case "approved":
        return {
          icon: <ShieldCheck className="h-6 w-6 text-primary" />,
          label: t.kyc.statusApproved,
          desc: t.kyc.descApproved,
          ctaLabel: t.kyc.ctaView,
          variant: "default" as const,
        };
      case "pending":
        return {
          icon: <Clock className="h-6 w-6 text-muted-foreground" />,
          label: t.kyc.statusPending,
          desc: t.kyc.descPending,
          ctaLabel: t.kyc.ctaView,
          variant: "secondary" as const,
        };
      case "rejected":
        return {
          icon: <ShieldX className="h-6 w-6 text-destructive" />,
          label: t.kyc.statusRejected,
          desc: t.kyc.descRejected,
          ctaLabel: t.kyc.ctaResubmit,
          variant: "destructive" as const,
        };
      default:
        return {
          icon: <ShieldAlert className="h-6 w-6 text-muted-foreground" />,
          label: t.kyc.statusNone,
          desc: t.kyc.descNone,
          ctaLabel: t.kyc.ctaStart,
          variant: "outline" as const,
        };
    }
  })();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.heading}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
            {t.subheading}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href={`/${locale}/account/edit`}>
            <Pencil className="h-3.5 w-3.5" />
            {t.editCta}
          </Link>
        </Button>
      </header>

      <div className="mt-10 space-y-4">
        <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.identity.title}
          </h2>
          <dl className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t.identity.nameLabel}
              </dt>
              <dd className="mt-1 text-[16px] font-medium tracking-tight">
                {fullName ?? (
                  <span className="text-muted-foreground">
                    {t.identity.namePlaceholder}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t.identity.phoneLabel}
              </dt>
              <dd className="mt-1 font-mono text-[16px] tracking-tight">
                +{phone}
              </dd>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.identity.phoneHint}
              </p>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">
                {t.identity.emailLabel}
              </dt>
              <dd className="mt-1 text-[16px] font-medium tracking-tight break-all">
                {profile?.email ?? (
                  <span className="text-muted-foreground">
                    {t.identity.emailPlaceholder}
                  </span>
                )}
              </dd>
            </div>
            {profile?.created_at && (
              <div>
                <dt className="text-[12px] text-muted-foreground">
                  {t.identity.memberSinceLabel}
                </dt>
                <dd className="mt-1 text-[16px] font-medium tracking-tight">
                  {formatDate(profile.created_at, locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            {kycCard.icon}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t.kyc.title}
                </h2>
                <Badge variant={kycCard.variant}>
                  {kycStatus === "approved" && (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {kycCard.label}
                </Badge>
              </div>
              <p className="mt-2 text-[14px] text-muted-foreground">
                {kycCard.desc}
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
              >
                <Link href={`/${locale}/kyc`}>{kycCard.ctaLabel}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.credit.title}
            </h2>
            <Link
              href={`/${locale}/account/payments`}
              className="text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t.viewAllPayments} →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[12px] text-muted-foreground">
                {t.credit.limitLabel}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {formatTzs(profile?.credit_limit_tzs ?? 0, locale)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.credit.limitHint}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-muted-foreground">
                {t.credit.pointsLabel}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {profile?.credit_points ?? 0}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.credit.pointsHint}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Download className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t.dataExport.title}
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                {t.dataExport.body}
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
              >
                <Link href={`/${locale}/account/export`}>{t.dataExport.cta}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">
                {t.dangerZone.title}
              </h2>
              <p className="mt-2 text-[14px] text-muted-foreground">
                {t.dangerZone.body}
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-4 rounded-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Link href={`/${locale}/account/delete`}>{t.dangerZone.cta}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
