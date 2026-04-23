"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/i18n/provider";

const STORAGE_KEY = "ubepari-cookies-dismissed";
const EVENT_NAME = "ubepari-cookies-dismissed-change";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT_NAME, handler);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// During SSR we render as-if dismissed so the banner never appears in the
// static HTML. The real value flips in on hydration.
function getServerSnapshot(): boolean {
  return true;
}

export function CookieDisclosure() {
  const dict = useDictionary();
  const locale = useLocale();
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  const t = dict.cookies;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // best-effort; banner still closes via the event below
    }
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-2xl items-start gap-3 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:items-center sm:gap-4 sm:p-5"
      >
        <div className="flex-1 text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
          {t.body}{" "}
          <Link
            href={`/${locale}/legal/privacy`}
            className="text-foreground underline-offset-2 hover:underline"
          >
            {t.privacyLink}
          </Link>
          .
        </div>
        <Button
          onClick={dismiss}
          size="sm"
          variant="outline"
          className="rounded-full"
        >
          {t.ok}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          aria-label={t.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
