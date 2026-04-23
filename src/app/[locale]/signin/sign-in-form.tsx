"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

type PasswordError = "invalid_phone" | "invalid_credentials" | "locked" | "unknown";

type Mode = "otp" | "password";

export function SignInForm() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("otp");

  const t = dict.signin;
  const otp = dict.otp;

  // --- OTP flow state ---
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<OtpError | null>(null);
  const [otpPending, startOtpTransition] = useTransition();

  // --- Password flow state ---
  const [pwPhone, setPwPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<PasswordError | null>(null);
  const [pwPending, startPwTransition] = useTransition();

  const otpErrorMsg = (e: OtpError | null) =>
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

  const pwErrorMsg = (e: PasswordError | null) =>
    e === null
      ? null
      : e === "invalid_phone"
        ? otp.errors.invalidPhone
        : e === "invalid_credentials"
          ? t.passwordInvalid
          : e === "locked"
            ? t.passwordLocked
            : t.passwordError;

  async function sendOtp() {
    setOtpError(null);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOtpError((body.error as OtpError) ?? "unknown");
      return;
    }
    setSentPhone(body.phone as string);
    setPhase("code");
  }

  async function verifyOtp() {
    setOtpError(null);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: sentPhone, code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOtpError((body.error as OtpError) ?? "unknown");
      return;
    }
    router.push(`/${locale}/account/goals`);
    router.refresh();
  }

  async function signInWithPassword() {
    setPwError(null);
    const res = await fetch("/api/auth/password/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: pwPhone, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPwError((body.error as PasswordError) ?? "unknown");
      return;
    }
    router.push(`/${locale}/account/goals`);
    router.refresh();
  }

  // OTP code-entry phase stays full-width (no tabs shown)
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
              setOtpError(null);
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
        {otpError && (
          <p className="text-center text-[12px] text-destructive">
            {otpErrorMsg(otpError)}
          </p>
        )}
        <Button
          className="w-full rounded-full"
          size="lg"
          disabled={code.length !== 6 || otpPending}
          onClick={() => startOtpTransition(verifyOtp)}
        >
          {otp.verifyButton}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6">
      <div className="grid grid-cols-2 gap-1 rounded-full border border-border/60 bg-background/60 p-1 text-[12px] font-medium">
        <button
          type="button"
          onClick={() => setMode("otp")}
          className={`rounded-full py-2 transition-all ${
            mode === "otp"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.tabOtp}
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`rounded-full py-2 transition-all ${
            mode === "password"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.tabPassword}
        </button>
      </div>

      {mode === "otp" ? (
        <div className="mt-6 space-y-4">
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
          {otpError && (
            <p className="text-center text-[12px] text-destructive">
              {otpErrorMsg(otpError)}
            </p>
          )}
          <Button
            className="w-full rounded-full"
            size="lg"
            disabled={phone.trim().length < 9 || otpPending}
            onClick={() => startOtpTransition(sendOtp)}
          >
            {t.sendOtp}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">{t.otpHint}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw-phone">{t.phoneLabel}</Label>
            <Input
              id="pw-phone"
              placeholder={t.phonePlaceholder}
              className="mt-2"
              autoComplete="tel"
              inputMode="tel"
              value={pwPhone}
              onChange={(e) => setPwPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pw-password">{t.passwordLabel}</Label>
            <Input
              id="pw-password"
              type="password"
              autoComplete="current-password"
              placeholder={t.passwordPlaceholder}
              className="mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {pwError && (
            <p className="text-center text-[12px] text-destructive">
              {pwErrorMsg(pwError)}
            </p>
          )}
          <Button
            className="w-full rounded-full"
            size="lg"
            disabled={
              pwPhone.trim().length < 9 || password.length < 1 || pwPending
            }
            onClick={() => startPwTransition(signInWithPassword)}
          >
            {t.signInWithPassword}
          </Button>
          <p className="text-center text-[12px]">
            <Link
              href={`/${locale}/signin/reset`}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t.forgotPassword}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
