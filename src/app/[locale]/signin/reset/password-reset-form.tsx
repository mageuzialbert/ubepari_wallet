"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary, useLocale } from "@/i18n/provider";

type Phase = "phone" | "code" | "done";
type ErrorCode =
  | "invalid_phone"
  | "too_many_requests"
  | "sms_failed"
  | "wrong"
  | "expired"
  | "too_many_attempts"
  | "weak_password"
  | "not_found"
  | "unknown";

export function PasswordResetForm() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const t = dict.passwordReset;
  const otp = dict.otp;

  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMsg = (e: ErrorCode | null) =>
    e === null
      ? null
      : e === "invalid_phone"
        ? otp.errors.invalidPhone
        : e === "too_many_requests"
          ? otp.errors.tooManyRequests
          : e === "sms_failed"
            ? otp.errors.smsFailed
            : e === "wrong"
              ? t.errorWrongCode
              : e === "expired"
                ? t.errorExpired
                : e === "too_many_attempts"
                  ? t.errorTooMany
                  : e === "weak_password"
                    ? t.errorWeak
                    : e === "not_found"
                      ? t.errorNotFound
                      : t.errorGeneric;

  async function sendCode() {
    setError(null);
    const res = await fetch("/api/auth/password/reset/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as ErrorCode) ?? "unknown");
      return;
    }
    setPhase("code");
  }

  async function confirm() {
    setError(null);
    const res = await fetch("/api/auth/password/reset/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone, code, newPassword: password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as ErrorCode) ?? "unknown");
      return;
    }
    setPhase("done");
  }

  if (phase === "done") {
    return (
      <div className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight">{t.successTitle}</h2>
        <p className="text-[14px] text-muted-foreground">{t.successBody}</p>
        <Button
          className="w-full rounded-full"
          size="lg"
          onClick={() => {
            router.push(`/${locale}/account/goals`);
            router.refresh();
          }}
        >
          {t.continueButton}
        </Button>
      </div>
    );
  }

  if (phase === "code") {
    return (
      <div className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
        <div>
          <Label htmlFor="reset-code">{t.codeLabel}</Label>
          <Input
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-2 text-center font-mono text-lg tracking-widest"
          />
        </div>
        <div>
          <Label htmlFor="reset-password">{t.newPasswordLabel}</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{t.newPasswordHint}</p>
        </div>
        {error && (
          <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>
        )}
        <Button
          className="w-full rounded-full"
          size="lg"
          disabled={code.length !== 6 || password.length < 8 || pending}
          onClick={() => startTransition(confirm)}
        >
          {t.confirmButton}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-3xl border border-border/60 bg-card p-6">
      <div>
        <Label htmlFor="reset-phone">{t.phoneLabel}</Label>
        <Input
          id="reset-phone"
          autoComplete="tel"
          inputMode="tel"
          placeholder="255 7XX XXX XXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-2"
        />
      </div>
      {error && (
        <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>
      )}
      <Button
        className="w-full rounded-full"
        size="lg"
        disabled={phone.trim().length < 9 || pending}
        onClick={() => startTransition(sendCode)}
      >
        {t.sendCodeButton}
      </Button>
    </div>
  );
}
