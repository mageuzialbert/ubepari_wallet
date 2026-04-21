import "server-only";
import type { Locale } from "@/i18n/config";

const dictionaries = {
  en: () => import("@/messages/en.json").then((m) => m.default),
  sw: () => import("@/messages/sw.json").then((m) => m.default),
} as const;

export const getDictionary = (locale: Locale) => dictionaries[locale]();

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;
