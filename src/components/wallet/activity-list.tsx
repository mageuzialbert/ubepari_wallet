"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

import { formatTzs } from "@/lib/currency";
import { formatDate } from "@/lib/datetime";
import { CARD_SPRING, STAGGER_STEP_S, useReducedMotion } from "@/lib/motion";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { WalletActivityEntry } from "@/lib/wallet";

type ActivityNotes = Dictionary["wallet"]["activityNotes"];

function resolveNote(
  entry: WalletActivityEntry,
  notes: ActivityNotes,
): string {
  const params = entry.noteParams ?? {};
  const template = (notes as Record<string, string | undefined>)[entry.noteKey];
  if (!template) return entry.noteKey;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = (params as Record<string, unknown>)[key];
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  });
}

function productLabel(
  entry: WalletActivityEntry,
  goalLabelMap: Map<string, string> | undefined,
): string | null {
  if (!goalLabelMap) return null;
  if (entry.allocationGoalId) {
    return goalLabelMap.get(entry.allocationGoalId) ?? null;
  }
  // For allocate_out (debit on Available, goalId lives in note_params).
  const params = entry.noteParams as Record<string, unknown> | undefined;
  const id = params?.goalId;
  if (typeof id === "string") return goalLabelMap.get(id) ?? null;
  return null;
}

export function ActivityList({
  entries,
  dict,
  locale,
  goalLabelMap,
}: {
  entries: WalletActivityEntry[];
  dict: Dictionary["wallet"];
  locale: Locale;
  goalLabelMap?: Map<string, string>;
}) {
  const reduced = useReducedMotion();

  if (entries.length === 0) {
    return (
      <p className="mt-4 text-[13px] text-muted-foreground">{dict.emptyActivity}</p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-border/60">
      {entries.map((entry, i) => {
        const isCredit = entry.kind === "credit";
        const Icon = isCredit ? ArrowDownRight : ArrowUpRight;
        const sign = isCredit ? "+" : "−";
        const product = productLabel(entry, goalLabelMap);

        const initial = reduced ? false : { opacity: 0, y: 8 };
        const animate = reduced ? undefined : { opacity: 1, y: 0 };
        const transition = reduced
          ? undefined
          : { ...CARD_SPRING, delay: i * STAGGER_STEP_S };

        return (
          <motion.li
            key={entry.id}
            initial={initial}
            animate={animate}
            transition={transition}
            className="flex items-center justify-between gap-3 py-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={
                  isCredit
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
                    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground"
                }
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tracking-tight">
                  {resolveNote(entry, dict.activityNotes)}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>
                    {formatDate(entry.createdAt, locale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                      entry.bucket === "allocated"
                        ? "border-foreground/20 text-foreground/80"
                        : "border-border/60"
                    }`}
                  >
                    {dict.bucket[entry.bucket]}
                  </span>
                  {product && (
                    <span className="truncate text-[11px] text-muted-foreground/80">
                      · {product}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="shrink-0 text-[14px] font-semibold tracking-tight tabular-nums">
              {sign}
              {formatTzs(entry.amountTzs, locale)}
            </p>
          </motion.li>
        );
      })}
    </ul>
  );
}
