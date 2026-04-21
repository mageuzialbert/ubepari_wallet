"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Phone, XCircle } from "lucide-react";

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

const PROVIDERS: Provider[] = ["mpesa", "tigopesa", "airtelmoney"];

type Step =
  | { kind: "form" }
  | { kind: "pending"; paymentId: string; provider: Provider }
  | { kind: "done" }
  | { kind: "failed" };

export function PayInstallmentDialog({
  installmentId,
  amountTzs,
  trigger,
}: {
  installmentId: string;
  amountTzs: number;
  trigger: React.ReactNode;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.payInstallment;
  const providerLabels = dict.reserve.providers;

  const [open, setOpen] = React.useState(false);
  const [provider, setProvider] = React.useState<Provider>("mpesa");
  const [phone, setPhone] = React.useState("");
  const [step, setStep] = React.useState<Step>({ kind: "form" });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

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
          setStep({ kind: "done" });
          window.clearInterval(interval);
        } else if (body.payment.status === "failed") {
          setStep({ kind: "failed" });
          window.clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [step]);

  const submit = async () => {
    setError(null);
    const res = await fetch("/api/wallet/pay-installment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ installmentId, provider, phone }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.paymentId) {
      console.error("[pay-installment]", body);
      setError(t.errorGeneric);
      return;
    }
    setStep({
      kind: "pending",
      paymentId: body.paymentId,
      provider: body.provider ?? provider,
    });
  };

  const reset = () => {
    setStep({ kind: "form" });
    setError(null);
  };

  const amountLabel = formatTzs(amountTzs, locale);

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
              <DialogDescription>
                {t.description
                  .replace("{amount}", amountLabel)
                  .replace("{provider}", providerLabels[provider])}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>{t.providerLabel}</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => (
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
                      {providerLabels[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="installment-phone">{t.phoneLabel}</Label>
                <div className="relative mt-2">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="installment-phone"
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
                onClick={() => setOpen(false)}
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

        {step.kind === "pending" && (
          <div className="space-y-4 py-2 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t.pendingTitle}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground">
                {t.pendingBody.replace("{provider}", providerLabels[step.provider])}
              </p>
            </div>
          </div>
        )}

        {step.kind === "done" && (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{t.doneTitle}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground">{t.doneBody}</p>
            </div>
            <Button className="rounded-full" onClick={() => setOpen(false)}>
              {t.doneButton}
            </Button>
          </div>
        )}

        {step.kind === "failed" && (
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
      </DialogContent>
    </Dialog>
  );
}
