"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary, useLocale } from "@/i18n/provider";

type OtpError =
  | "invalid_phone"
  | "too_many_requests"
  | "expired"
  | "wrong"
  | "too_many_attempts"
  | "sms_failed"
  | "consent_required"
  | "unknown";

export function SignInForm() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<OtpError | null>(null);
  const [pending, startTransition] = useTransition();

  const t = dict.signin;
  const otp = dict.otp;

  const errorMsg = (e: OtpError | null) =>
    e === null
      ? null
      : e === "invalid_phone"
        ? otp.errors.invalidPhone
        : e === "too_many_requests"
          ? otp.errors.tooManyRequests
          : e === "expired"
            ? otp.errors.expired
            : e === "wrong"
              ? otp.errors.wrong
              : e === "too_many_attempts"
                ? otp.errors.tooManyAttempts
                : e === "sms_failed"
                  ? otp.errors.smsFailed
                  : e === "consent_required"
                    ? t.notRegistered
                    : otp.errors.unknown;

  async function sendOtp() {
    setError(null);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as OtpError) ?? "unknown");
      return;
    }
    setSentPhone(body.phone as string);
    setPhase("code");
  }

  async function verifyOtp() {
    setError(null);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: sentPhone, code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as OtpError) ?? "unknown");
      return;
    }
    router.push(`/${locale}/wallet`);
    router.refresh();
  }

  if (phase === "code") {
    return (
      <div className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
        <div className="text-center">
          <p className="text-[14px]">
            {otp.sentTo.replace("{phone}", sentPhone)}
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("phone");
              setCode("");
              setError(null);
            }}
            className="mt-1 text-[12px] text-muted-foreground underline-offset-4 hover:underline"
          >
            {otp.changeNumber}
          </button>
        </div>
        <div>
          <Label htmlFor="code">{otp.codeLabel}</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={otp.codePlaceholder}
            className="mt-2 text-center font-mono text-lg tracking-widest"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        {error && <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>}
        <Button
          className="w-full rounded-full"
          size="lg"
          disabled={code.length !== 6 || pending}
          onClick={() => startTransition(verifyOtp)}
        >
          {otp.verifyButton}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
      <div>
        <Label htmlFor="phone">{t.phoneLabel}</Label>
        <Input
          id="phone"
          placeholder={t.phonePlaceholder}
          className="mt-2"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>}
      <Button
        className="w-full rounded-full"
        size="lg"
        disabled={phone.trim().length < 9 || pending}
        onClick={() => startTransition(sendOtp)}
      >
        {t.sendOtp}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">{t.otpHint}</p>
    </div>
  );
}
