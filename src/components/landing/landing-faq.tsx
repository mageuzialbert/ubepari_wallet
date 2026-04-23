"use client";

import { motion } from "motion/react";

import { useDictionary } from "@/i18n/provider";

export function LandingFaq() {
  const t = useDictionary().faq;

  return (
    <section className="mx-auto mt-32 max-w-4xl px-4 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.heading}
        </h2>
      </div>

      <div className="mt-10 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
        {t.items.map((item, i) => (
          <motion.details
            key={item.q}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group p-6 sm:p-7"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-[16px] font-medium tracking-tight list-none [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </motion.details>
        ))}
      </div>
    </section>
  );
}
