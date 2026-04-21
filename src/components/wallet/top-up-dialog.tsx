"use client";

import * as React from "react";
import { Check, Loader2, Smartphone, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTzs } from "@/lib/currency";
import { useDictionary, useLocale } from "@/i18n/provider";

type Provider = "mpesa" | "tigopesa" | "airtelmoney";

const PROVIDERS: { id: Provider; label: string; logo: string }[] = [
  { id: "mpesa", label: "M-Pesa", logo: "M" },
  { id: "tigopesa", label: "Tigo Pesa", logo: "T" },
  { id: "airtelmoney", label: "Airtel Money", logo: "A" },
];

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000];

type Step =
  | { kind: "form" }
  | { kind: "pending"; paymentId: string; reference: string; provider: Provider }
  | { kind: "done"; reference: string }
  | { kind: "failed" };

export function TopUpDialog({ trigger }: { trigger: React.ReactNode }) {
  const [provider, setProvider] = React.useState<Provider>("mpesa");
  const [amount, setAmount] = React.useState<number>(100_000);
  const [phone, setPhone] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>({ kind: "form" });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const locale = useLocale();
  const t = useDictionary().topup;

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((body: { user: { phone: string } | null }) => {
        if (body.user?.phone) setPhone(body.user.phone);
      })
      .catch(() => {});
  }, [open]);

  React.useEffect(() => {
    if (step.kind !== "pending") return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/payments/${step.paymentId}`);
        if (!res.ok) return;
        const body = (await res.json()) as { payment: { status: string } };
        if (body.payment.status === "success") {
          setStep({ kind: "done", reference: step.reference });
          window.clearInterval(interval);
        } else if (body.payment.status === "failed") {
          setStep({ kind: "failed" });
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
  }, [step]);

  const submit = async () => {
    setError(null);
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountTzs: amount, provider, phone }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.paymentId) {
      console.error("[topup]", body);
      setError(t.errorGeneric);
      return;
    }
    setStep({
      kind: "pending",
      paymentId: body.paymentId,
      reference: body.reference,
      provider: body.provider ?? provider,
    });
  };

  const reset = () => {
    setStep({ kind: "form" });
    setError(null);
    setAmount(100_000);
  };

  const formattedAmount = formatTzs(amount, locale);
  const providerLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(reset, 250);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step.kind === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>{t.title}</DialogTitle>
              <DialogDescription>{t.description}</DialogDescription>
            </DialogHeader>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-[11px] font-medium transition-all ${
                    provider === p.id
                      ? "border-foreground bg-foreground/5"
                      : "border-border/70 hover:border-foreground/40"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background font-semibold">
                    {p.logo}
                  </div>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="amount">{t.amountLabel}</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-2 text-lg"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`rounded-full border px-3 py-1 text-[11px] transition-all ${
                      amount === a
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {formatTzs(a, locale)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="topup-phone">{t.mobileMoneyLabel}</Label>
              <Input
                id="topup-phone"
                placeholder="255 7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t.mobileMoneyHint.replace("{provider}", providerLabel)}
              </p>
            </div>

            {error && <p className="mt-2 text-[12px] text-destructive">{error}</p>}

            <DialogFooter className="mt-4">
              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={() => startTransition(submit)}
                disabled={amount < 1000 || phone.trim().length < 9 || pending}
              >
                <Smartphone className="h-4 w-4" />{" "}
                {t.mnoRequestButton.replace("{amount}", formattedAmount)}
              </Button>
            </DialogFooter>
          </>
        )}

        {step.kind === "pending" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <div>
              <p className="font-medium">
                {t.pendingTitle.replace("{provider}", providerLabel)}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{t.pendingBody}</p>
            </div>
          </div>
        )}

        {step.kind === "done" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">
                {t.doneTitle.replace("{amount}", formattedAmount)}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t.doneReference.replace("{ref}", step.reference)}
              </p>
            </div>
            <Button className="rounded-full" onClick={() => setOpen(false)} size="lg">
              {t.doneButton}
            </Button>
          </div>
        )}

        {step.kind === "failed" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium">{t.failedTitle}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{t.failedBody}</p>
            </div>
            <Button className="rounded-full" onClick={reset} size="lg">
              {t.retryButton}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
