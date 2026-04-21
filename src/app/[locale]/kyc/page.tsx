import type { Metadata } from "next";
import { FileUp, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  return { title: dict.kyc.metaTitle };
}

export default async function KycPage({ params }: { params: PageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
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
        <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
          {t.body}
        </p>
      </header>

      <div className="mt-10 space-y-4">
        <form className="space-y-6 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
          <div>
            <Label htmlFor="nida">{t.nidaLabel}</Label>
            <Input
              id="nida"
              placeholder={t.nidaPlaceholder}
              className="mt-2 font-mono"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t.nidaHint}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first">{t.legalFirstName}</Label>
              <Input id="first" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="last">{t.legalLastName}</Label>
              <Input id="last" className="mt-2" />
            </div>
          </div>

          <div>
            <Label>{t.uploadLabel}</Label>
            <div className="mt-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-background/50 p-8 text-center">
              <div>
                <FileUp className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 text-[14px] font-medium">{t.uploadDrop}</p>
                <p className="text-[12px] text-muted-foreground">
                  {t.uploadFormats}
                </p>
                <Button variant="outline" size="sm" className="mt-3 rounded-full">
                  {t.uploadChoose}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="workplace">{t.workplaceLabel}</Label>
            <Input
              id="workplace"
              placeholder={t.workplacePlaceholder}
              className="mt-2"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t.workplaceHint}
            </p>
          </div>

          <Button className="w-full rounded-full" size="lg">
            {t.submit}
          </Button>
        </form>

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
