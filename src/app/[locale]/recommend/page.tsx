"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const EXAMPLES = [
  "I'm a graphic designer who edits 4K video on weekends. Budget 4M.",
  "University student studying computer science. Need it for coding and light gaming. Under 2.5M.",
  "I run a small accounting firm — 3 laptops for staff. Office-grade, budget 6M total.",
  "Serious Valorant and CS2 player. Want 165Hz and RTX 4060 minimum.",
];

export default function RecommendPage() {
  const [input, setInput] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <Wand2 className="h-3 w-3" strokeWidth={2.5} />
          AI Advisor · beta
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Tell us who you are.
        </h1>
        <p className="mt-4 max-w-xl text-[16px] text-muted-foreground">
          What will you do with this PC? Budget? Any brands you love or hate?
          Type anything — the more natural, the better the match.
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
            placeholder="e.g. I'm a graphic designer who edits 4K video on weekends…"
            rows={4}
            className="w-full resize-none bg-transparent p-4 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/60 p-2">
            <p className="px-2 text-[11px] text-muted-foreground">
              ⌘/Ctrl + Enter to send
            </p>
            <Button
              type="submit"
              disabled={input.trim().length < 10}
              className="rounded-full"
            >
              Find my PC <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      {!submitted ? (
        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Or try one of these
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {EXAMPLES.map((ex) => (
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
              Your match
            </p>
            <p className="mt-3 text-[15px] leading-relaxed">
              Based on your story, I recommend the <strong>Dell XPS 15 OLED</strong> —
              the 3.5K OLED is a gift for retouching work, and the RTX 4060
              handles 4K timelines without choking. Fits your budget at
              TZS 380K/month over 12 months.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link href="/store/dell-xps-15-oled">
                See full spec <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Full conversational AI advisor ships with the next release. Prototype
            shows a static recommendation here.
          </p>
        </motion.div>
      )}
    </div>
  );
}
