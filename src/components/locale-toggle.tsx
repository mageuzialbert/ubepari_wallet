"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { locales, type Locale, LOCALE_COOKIE } from "@/i18n/config";

function currentLocale(pathname: string): Locale {
  const segment = pathname.split("/").find(Boolean);
  return (locales as readonly string[]).includes(segment ?? "")
    ? (segment as Locale)
    : "en";
}

function swapLocale(pathname: string, next: Locale): string {
  const parts = pathname.split("/");
  if ((locales as readonly string[]).includes(parts[1])) {
    parts[1] = next;
    return parts.join("/") || "/";
  }
  return `/${next}${pathname === "/" ? "" : pathname}`;
}

const LABELS: Record<Locale, string> = {
  en: "EN",
  sw: "SW",
};

export function LocaleToggle() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const active = currentLocale(pathname);
  const next: Locale = active === "en" ? "sw" : "en";

  const onClick = () => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.replace(swapLocale(pathname, next));
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={`Switch language to ${LABELS[next]}`}
      className="rounded-full gap-1.5 px-3 text-[12px] font-medium tracking-wide"
    >
      <Languages className="h-[1.05rem] w-[1.05rem]" />
      <span className="tabular-nums">{LABELS[active]}</span>
    </Button>
  );
}
