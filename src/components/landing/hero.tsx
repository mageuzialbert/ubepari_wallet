"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LandingHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden"
    >
      <AmbientGradient />

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 pb-0 text-center sm:px-6 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3 w-3" strokeWidth={2.5} />
          New — Own your dream PC in 3 taps
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl md:text-7xl"
        >
          Own it today.
          <br />
          <span className="bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent">
            Pay in parts.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
        >
          The premium way to buy a PC in Tanzania. Choose your machine, pay a
          deposit, and walk out with it today — everything else lives in your
          Ubepari Wallet.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="rounded-full px-6 text-[14px]">
            <Link href="/store">
              Browse PCs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="rounded-full px-6 text-[14px]"
          >
            <Link href="/recommend">Ask the AI Advisor →</Link>
          </Button>
        </motion.div>

        <motion.div
          style={{ y, opacity, scale }}
          className="relative mt-16 w-full max-w-5xl sm:mt-20"
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-t-3xl border border-border/60 bg-gradient-to-b from-muted/40 to-background shadow-2xl shadow-black/20">
            <Image
              src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=2000&q=90"
              alt="Ubepari PC hero"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4 text-left">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                  Featured
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  MacBook Pro 14″ M4
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-right backdrop-blur-md">
                <p className="text-[11px] text-white/70">From</p>
                <p className="text-lg font-semibold text-white">
                  TZS 450,000 / mo
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AmbientGradient() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl dark:from-primary/20"
      />
    </>
  );
}
