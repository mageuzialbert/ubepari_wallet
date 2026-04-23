"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/i18n/provider";

export function AiCta() {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.aiCta;

  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/80 p-10 text-background sm:p-16"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-background/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-background/5 blur-3xl"
        />

        <div className="relative grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/10 px-3 py-1 text-[11px] font-medium backdrop-blur">
              <Wand2 className="h-3 w-3" strokeWidth={2.5} />
              {t.badge}
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.headingLine1}
              <br />
              {t.headingLine2}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed opacity-80">
              {t.body}
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-7 rounded-full px-6"
            >
              <Link href={`/${locale}/assistant`}>
                {t.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <ChatMock />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function ChatMock() {
  const t = useDictionary().aiCta.chat;
  return (
    <div className="rounded-2xl border border-background/15 bg-background/10 p-5 backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 shrink-0 rounded-full bg-background/20" />
        <div className="flex-1 rounded-2xl rounded-tl-md bg-background/15 px-4 py-3 text-[14px]">
          {t.userMessage}
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <div className="h-7 w-7 shrink-0 rounded-full bg-background text-foreground text-[11px] font-semibold flex items-center justify-center">
          {t.aiLabel}
        </div>
        <div className="flex-1 space-y-3">
          <div className="rounded-2xl rounded-tl-md bg-background px-4 py-3 text-[14px] text-foreground">
            {t.aiPrefix}
            <strong>{t.aiProductName}</strong>
            {t.aiSuffix}
          </div>
          <div className="flex gap-2 text-[12px] opacity-80">
            <span className="rounded-full bg-background/20 px-2 py-0.5">
              {t.price}
            </span>
            <span className="rounded-full bg-background/20 px-2 py-0.5">
              {t.plan}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
