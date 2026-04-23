"use client";

import type { Locale } from "@/i18n/config";
import type { CardPayload } from "@/lib/assistant/tools";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: CardPayload[];
  streaming?: boolean;
};

const STORAGE_KEY = (locale: Locale) =>
  `ubepari.assistant.anon.history.${locale}`;
const HISTORY_CAP = 12;

export function loadAnonHistory(locale: Locale): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY(locale));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-HISTORY_CAP);
  } catch {
    return [];
  }
}

export function saveAnonHistory(locale: Locale, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = messages.slice(-HISTORY_CAP).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      cards: m.cards,
    }));
    window.localStorage.setItem(STORAGE_KEY(locale), JSON.stringify(trimmed));
  } catch {
    // quota exceeded — drop silently
  }
}

export function clearAnonHistory(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY(locale));
  } catch {
    // ignore
  }
}
