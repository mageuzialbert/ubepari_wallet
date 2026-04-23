"use client";

import * as React from "react";
import { Share, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { useDictionary } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ubepari.install.dismissed";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
};

type Mode = "hidden" | "android" | "ios";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const when = new Date(raw).getTime();
    if (Number.isNaN(when)) return false;
    const ms = DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - when < ms;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const dict = useDictionary();
  const [mode, setMode] = React.useState<Mode>("hidden");
  const promptEvent = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      promptEvent.current = event as BeforeInstallPromptEvent;
      setMode("android");
    };

    const onInstalled = () => {
      promptEvent.current = null;
      setMode("hidden");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (isIos()) {
      const timer = window.setTimeout(() => setMode("ios"), 1500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      // ignore storage errors
    }
    setMode("hidden");
  }, []);

  const install = React.useCallback(async () => {
    const event = promptEvent.current;
    if (!event) return;
    try {
      await event.prompt();
      await event.userChoice;
    } finally {
      promptEvent.current = null;
      setMode("hidden");
    }
  }, []);

  if (mode === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-label={dict.install.title}
      className={cn(
        "fixed inset-x-4 bottom-4 z-[60]",
        "md:inset-x-auto md:right-6 md:w-[22rem]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border border-border/60",
          "bg-card/85 px-3 py-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        )}
      >
        <Logo variant="mark" size="sm" className="ml-1" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-medium tracking-tight">
            {dict.install.title}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {mode === "ios" ? dict.install.iosHint : dict.install.subtitle}
          </div>
        </div>
        {mode === "android" ? (
          <Button
            size="sm"
            onClick={install}
            className="rounded-full px-4 text-[12px]"
          >
            {dict.install.cta}
          </Button>
        ) : (
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <Share className="h-4 w-4" />
          </span>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={dict.install.dismiss}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
