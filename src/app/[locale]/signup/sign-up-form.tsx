"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary, useLocale } from "@/i18n/provider";
import { LEGAL_VERSION } from "@/lib/legal";

type OtpError =
  | "invalid_phone"
  | "too_many_requests"
  | "expired"
  | "wrong"
  | "too_many_attempts"
  | "sms_failed"
  | "consent_required"
  | "unknown";

export function SignUpForm() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<"form" | "code">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sentPhone, setSentPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<OtpError | null>(null);
  const [pending, startTransition] = useTransition();

  const t = dict.signup;
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
                    ? t.consentRequired
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
      body: JSON.stringify({
        phone: sentPhone,
        code,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        flow: "signup",
        acceptedTermsVersion: LEGAL_VERSION,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as OtpError) ?? "unknown");
      return;
    }
    router.push(`/${locale}/kyc`);
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
              setPhase("form");
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="first">{t.firstName}</Label>
          <Input
            id="first"
            className="mt-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div>
          <Label htmlFor="last">{t.lastName}</Label>
          <Input
            id="last"
            className="mt-2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>
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
      <div>
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t.emailPlaceholder}
          className="mt-2"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/40 p-4 text-[12px] leading-relaxed text-muted-foreground transition-colors hover:border-border">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border/80 accent-foreground"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          {t.consentPrefix}
          <Link href={`/${locale}/legal/terms`} className="text-foreground underline underline-offset-2">
            {t.consentTerms}
          </Link>
          {t.consentComma}
          <Link href={`/${locale}/legal/privacy`} className="text-foreground underline underline-offset-2">
            {t.consentPrivacy}
          </Link>
          {t.consentAnd}
          <Link
            href={`/${locale}/legal/hire-purchase-agreement`}
            className="text-foreground underline underline-offset-2"
          >
            {t.consentHirePurchase}
          </Link>
          {t.consentSuffix}
        </span>
      </label>
      {error && <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>}
      <Button
        className="w-full rounded-full"
        size="lg"
        disabled={
          !firstName.trim() ||
          !lastName.trim() ||
          phone.trim().length < 9 ||
          !consent ||
          pending
        }
        onClick={() => startTransition(sendOtp)}
      >
        {t.submit}
      </Button>
    </div>
  );
}
