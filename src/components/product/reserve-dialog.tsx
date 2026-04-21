"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Phone, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTzs } from "@/lib/currency";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CreditTerm } from "@/lib/credit";

type Provider = "mpesa" | "tigopesa" | "airtelmoney";

type Phase =
  | { kind: "form" }
  | { kind: "pending"; orderId: string; provider: Provider }
  | { kind: "done"; orderId: string }
  | { kind: "failed"; retriable: boolean }
  | { kind: "redirect"; reason: "signin" | "kyc" };

export function ReserveDialog({
  open,
  onOpenChange,
  productSlug,
  planMonths,
  deposit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productSlug: string;
  planMonths: CreditTerm;
  deposit: number;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const t = dict.reserve;

  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Provider>("mpesa");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { user: { phone: string } | null }) => {
        if (body.user?.phone) setPhone(body.user.phone);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (phase.kind !== "pending") return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/orders/${phase.orderId}`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          order: { status: string };
          deposit: { status: string } | null;
        };
        if (body.order.status === "active" || body.deposit?.status === "success") {
          setPhase({ kind: "done", orderId: phase.orderId });
          window.clearInterval(interval);
        } else if (body.order.status === "cancelled" || body.deposit?.status === "failed") {
          setPhase({ kind: "failed", retriable: true });
          window.clearInterval(interval);
        }
      } catch {
        // network hiccup; keep polling
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase]);

  function reset() {
    setPhase({ kind: "form" });
    setError(null);
  }

  async function submit() {
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productSlug, planMonths, provider, phone }),
    });
    if (res.status === 401) {
      setPhase({ kind: "redirect", reason: "signin" });
      return;
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      if (body.error === "kyc_not_approved") {
        setPhase({ kind: "redirect", reason: "kyc" });
        return;
      }
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.orderId) {
      console.error("[reserve] failed", body);
      setError(t.errorGeneric);
      return;
    }
    setPhase({ kind: "pending", orderId: body.orderId, provider: body.provider ?? provider });
  }

  const depositLabel = formatTzs(deposit, locale);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {phase.kind === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>{t.title}</DialogTitle>
              <DialogDescription>
                {t.description.replace("{amount}", depositLabel)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t.providerLabel}</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["mpesa", "tigopesa", "airtelmoney"] as Provider[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`rounded-full border py-2 text-[12px] font-medium transition-all ${
                        provider === p
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {t.providers[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="reserve-phone">{t.phoneLabel}</Label>
                <div className="relative mt-2">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reserve-phone"
                    className="pl-9"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-[12px] text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => onOpenChange(false)}
              >
                {t.cancelButton}
              </Button>
              <Button
                className="rounded-full"
                disabled={pending || phone.trim().length < 9}
                onClick={() => startTransition(submit)}
              >
                {t.confirmButton}
              </Button>
            </DialogFooter>
          </>
        )}

        {phase.kind === "pending" && (
          <div className="space-y-4 py-2 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t.pendingTitle}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground">
                {t.pendingBody.replace("{provider}", t.providers[phase.provider])}
              </p>
            </div>
          </div>
        )}

        {phase.kind === "done" && (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t.doneTitle}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground">{t.doneBody}</p>
            </div>
            <Button
              className="rounded-full"
              onClick={() => {
                onOpenChange(false);
                router.push(`/${locale}/orders`);
              }}
            >
              {t.doneCta}
            </Button>
          </div>
        )}

        {phase.kind === "failed" && (
          <div className="space-y-4 py-2 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t.failedTitle}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground">{t.failedBody}</p>
            </div>
            <Button className="rounded-full" onClick={reset}>
              {t.retryButton}
            </Button>
          </div>
        )}

        {phase.kind === "redirect" && (
          <div className="space-y-4 py-2 text-center">
            <p className="text-[14px]">
              {phase.reason === "signin" ? t.needsSignIn : t.needsKyc}
            </p>
            <Button
              className="rounded-full"
              onClick={() => {
                onOpenChange(false);
                router.push(`/${locale}/${phase.reason === "signin" ? "signin" : "kyc"}`);
              }}
            >
              {phase.reason === "signin" ? dict.header.signIn : dict.kyc.submit}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
