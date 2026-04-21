"use client";

import { motion } from "motion/react";
import { FileCheck2, ShoppingBag, Smartphone } from "lucide-react";

import { useDictionary } from "@/i18n/provider";

const STEP_ICONS = [FileCheck2, ShoppingBag, Smartphone] as const;

export function HowItWorks() {
  const t = useDictionary().howItWorks;

  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          {t.body}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/60 md:grid-cols-3">
        {t.steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          const n = String(i + 1).padStart(2, "0");
          return (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col gap-5 bg-card p-8"
            >
              <div className="flex items-start justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/5">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <span className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
                  {n}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
