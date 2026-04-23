"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";
import { formatDate } from "@/lib/datetime";
import { useLocale } from "@/i18n/provider";

export type ConversationItem = {
  id: string;
  title: string | null;
  updatedAt: string;
};

type Props = {
  conversations: ConversationItem[];
  activeId: string | null;
  pending: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ConversationSidebar({
  conversations,
  activeId,
  pending,
  onNew,
  onSelect,
  onDelete,
}: Props) {
  const t = useDictionary().assistant;
  const locale = useLocale();

  return (
    <aside className="flex h-full flex-col gap-3">
      <Button
        type="button"
        onClick={onNew}
        disabled={pending}
        variant="outline"
        className="w-full justify-start rounded-full"
      >
        <Plus className="h-4 w-4" /> {t.newChat}
      </Button>
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t.historyLabel}
      </p>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 text-[12px] text-muted-foreground">
            {t.historyEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                      active ? "bg-foreground/[0.06]" : "hover:bg-accent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[13px] font-medium tracking-tight">
                        {c.title ?? t.newChat}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(c.updatedAt, locale)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label="Delete conversation"
                      className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
