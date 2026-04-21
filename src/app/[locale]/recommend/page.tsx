"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/i18n/provider";

export default function RecommendPage() {
  const [input, setInput] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const locale = useLocale();
  const t = useDictionary().recommend;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <Wand2 className="h-3 w-3" strokeWidth={2.5} />
          {t.badge}
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t.heading}
        </h1>
        <p className="mt-4 max-w-xl text-[16px] text-muted-foreground">
          {t.subheading}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="mt-10"
      >
        <div className="rounded-3xl border border-border/60 bg-card p-2 shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            rows={4}
            className="w-full resize-none bg-transparent p-4 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2">
            <p className="px-2 text-[11px] text-muted-foreground">
              {t.submitHint}
            </p>
            <Button
              type="submit"
              disabled={input.trim().length < 10}
              className="rounded-full"
            >
              {t.submit} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      {!submitted ? (
        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.examplesLabel}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {t.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="rounded-2xl border border-border/60 bg-card p-4 text-left text-[14px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                <Sparkles className="mr-2 inline h-3 w-3" strokeWidth={2.5} />
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 space-y-4"
        >
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t.yourMatch}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed">
              {(() => {
                const parts = t.matchResult.split("{product}");
                return (
                  <>
                    {parts[0]}
                    <strong>{t.matchProduct}</strong>
                    {parts[1]}
                  </>
                );
              })()}
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link href={`/${locale}/store/dell-xps-15-oled`}>
                {t.seeSpec} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground">{t.disclaimer}</p>
        </motion.div>
      )}
    </div>
  );
}
