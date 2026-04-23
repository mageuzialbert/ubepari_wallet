"use client";

import { Sparkles } from "lucide-react";

import { useDictionary } from "@/i18n/provider";

export function SuggestedPrompts({
  signedIn,
  onPick,
}: {
  signedIn: boolean;
  onPick: (prompt: string) => void;
}) {
  const t = useDictionary().assistant;
  const items = signedIn ? t.suggestedSignedIn : t.suggestedAnon;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t.suggestedLabel}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-2xl border border-border/60 bg-card p-4 text-left text-[14px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Sparkles className="mr-2 inline h-3 w-3" strokeWidth={2.5} />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
