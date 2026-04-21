"use client";

import * as React from "react";
import { Check, CreditCard, Smartphone } from "lucide-react";

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

type Provider = "M-Pesa" | "Tigo Pesa" | "Airtel Money" | "Card";

const PROVIDERS: { id: Provider; logo: string; kind: "mno" | "card" }[] = [
  { id: "M-Pesa", logo: "M", kind: "mno" },
  { id: "Tigo Pesa", logo: "T", kind: "mno" },
  { id: "Airtel Money", logo: "A", kind: "mno" },
  { id: "Card", logo: "•", kind: "card" },
];

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000];

export function TopUpDialog({ trigger }: { trigger: React.ReactNode }) {
  const [provider, setProvider] = React.useState<Provider>("M-Pesa");
  const [amount, setAmount] = React.useState<number>(100_000);
  const [phone, setPhone] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"form" | "pending" | "done">("form");

  const submit = () => {
    setStep("pending");
    setTimeout(() => setStep("done"), 1800);
  };

  const reset = () => {
    setStep("form");
    setAmount(100_000);
    setPhone("");
  };

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
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Top up your Wallet</DialogTitle>
              <DialogDescription>
                Add funds to pay installments, reserve a PC, or keep ahead of
                your schedule.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 grid grid-cols-4 gap-2">
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
                  {p.id}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="amount">Amount</Label>
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
                    {formatTzs(a)}
                  </button>
                ))}
              </div>
            </div>

            {PROVIDERS.find((p) => p.id === provider)?.kind === "mno" ? (
              <div className="mt-4">
                <Label htmlFor="phone">Mobile money number</Label>
                <Input
                  id="phone"
                  placeholder="255 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You'll get a {provider} USSD prompt to authorize the
                  transfer.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Card number</Label>
                  <Input placeholder="•••• •••• •••• ••••" className="mt-2" />
                </div>
                <div>
                  <Label>Expiry</Label>
                  <Input placeholder="MM / YY" className="mt-2" />
                </div>
                <div>
                  <Label>CVC</Label>
                  <Input placeholder="•••" className="mt-2" />
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button
                className="w-full rounded-full"
                size="lg"
                onClick={submit}
                disabled={
                  amount < 1000 ||
                  (PROVIDERS.find((p) => p.id === provider)?.kind === "mno" &&
                    phone.length < 9)
                }
              >
                {provider === "Card" ? (
                  <>
                    <CreditCard className="h-4 w-4" /> Pay {formatTzs(amount)}
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4" /> Request{" "}
                    {formatTzs(amount)}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "pending" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
            <div>
              <p className="font-medium">Awaiting {provider} confirmation</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Check your phone and approve the USSD prompt.
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">
                {formatTzs(amount)} added to your Wallet
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Reference: TX-{Math.floor(Math.random() * 90000) + 10000}
              </p>
            </div>
            <Button
              className="rounded-full"
              onClick={() => setOpen(false)}
              size="lg"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
