"use client";

import { motion } from "motion/react";
import { FileCheck2, ShoppingBag, Smartphone } from "lucide-react";

const STEPS = [
  {
    icon: FileCheck2,
    n: "01",
    title: "Verify once.",
    body: "Upload your NIDA or passport. Our KYC team approves you — usually within a few hours — and you get your credit limit.",
  },
  {
    icon: ShoppingBag,
    n: "02",
    title: "Pick your PC.",
    body: "Browse the store or tell our AI Advisor what you need. Slide to see monthly plans over 3, 6, 9, or 12 months.",
  },
  {
    icon: Smartphone,
    n: "03",
    title: "Pay and own it.",
    body: "20% deposit via M-Pesa, Tigo Pesa, Airtel Money, or card. Walk out with the PC. Pay the rest from your Wallet.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          How it works
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Three taps. That's it.
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          We designed Ubepari so the distance between wanting a PC and owning
          it is as short as possible — without making you read a contract
          you'll never read.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/60 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.n}
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
                  {step.n}
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
