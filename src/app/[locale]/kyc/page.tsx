import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDictionary } from "../dictionaries";
import { KycForm } from "./kyc-form";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.kyc.metaTitle };
}

export default async function KycPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const session = await getSession();
  if (!session) redirect(`/${locale}/signin`);

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("kyc_status")
    .eq("id", session.claims.userId)
    .maybeSingle();

  const kycStatus = profile?.kyc_status ?? "none";

  const dict = await getDictionary(locale);
  const t = dict.kyc;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">{t.body}</p>
      </header>

      <div className="mt-10 space-y-4">
        {kycStatus === "pending" ? (
          <div className="rounded-3xl border border-border/60 bg-card p-8">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              {t.alreadyPendingTitle}
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              {t.alreadyPendingBody}
            </p>
          </div>
        ) : kycStatus === "approved" ? (
          <div className="rounded-3xl border border-border/60 bg-card p-8">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">
              {t.alreadyApprovedTitle}
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              {t.alreadyApprovedBody}
            </p>
          </div>
        ) : (
          <KycForm />
        )}

        <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> {t.whatHappensNext}
          </div>
          <ol className="mt-4 space-y-3 text-[14px]">
            {t.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
