import type { Locale } from "@/i18n/config";

const bcp47: Record<Locale, string> = {
  en: "en-GB",
  sw: "sw-TZ",
};

export function formatDate(
  date: Date | string | number,
  locale: Locale = "en",
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(bcp47[locale], options).format(d);
}
