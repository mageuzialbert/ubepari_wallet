"use client";

import * as React from "react";
import { ArrowUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";

type ComposerProps = {
  pending: boolean;
  onSend: (message: string) => void;
};

export function Composer({ pending, onSend }: ComposerProps) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const dict = useDictionary().assistant;

  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setValue("");
    onSend(trimmed);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-3xl border border-border/60 bg-card p-2 shadow-sm"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={dict.composerPlaceholder}
        className="w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <p className="text-[11px] text-muted-foreground">{dict.sendHint}</p>
        <Button
          type="submit"
          size="icon"
          disabled={pending || value.trim().length === 0}
          className="h-8 w-8 rounded-full"
          aria-label={dict.send}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
