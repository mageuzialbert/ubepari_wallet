"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

import { AssistantCard } from "@/components/assistant/cards";
import type { ChatMessage } from "@/lib/assistant/anonStorage";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-5">
      {messages.map((m) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={
            m.role === "user"
              ? "flex justify-end"
              : "flex flex-col items-start gap-3"
          }
        >
          {m.role === "user" ? (
            <div className="max-w-[80%] rounded-2xl bg-foreground/[0.04] px-4 py-2.5 text-[15px] leading-relaxed">
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ) : (
            <>
              <div className="max-w-[92%] rounded-2xl border border-border/60 bg-card px-4 py-3 text-[15px] leading-relaxed">
                {m.content.length === 0 && m.streaming ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </span>
                ) : (
                  <p className="whitespace-pre-wrap">
                    {m.content}
                    {m.streaming ? (
                      <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-foreground/60 align-middle" />
                    ) : null}
                  </p>
                )}
              </div>
              {m.cards && m.cards.length > 0 ? (
                <div className="grid w-full max-w-[92%] gap-2 sm:grid-cols-2">
                  {m.cards.map((card, i) => (
                    <AssistantCard key={`${m.id}-card-${i}`} card={card} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </motion.div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
