"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

type DeleteError =
  | "unauthenticated"
  | "not_found"
  | "too_many_requests"
  | "expired"
  | "wrong"
  | "too_many_attempts"
  | "sms_failed"
  | "unknown";

export function DeleteAccountForm({ locale }: { locale: Locale }) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.account.delete;
  const otp = dict.otp;

  const [phase, setPhase] = useState<"idle" | "code" | "done">("idle");
  const [confirmType, setConfirmType] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<DeleteError | null>(null);
  const [pending, startTransition] = useTransition();

  const errorMsg = (e: DeleteError | null) =>
    e === null
      ? null
      : e === "unauthenticated"
        ? t.errors.unauthenticated
        : e === "not_found"
          ? t.errors.notFound
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
                    : otp.errors.unknown;

  async function sendCode() {
    setError(null);
    const res = await fetch("/api/account/delete/send-otp", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as DeleteError) ?? "unknown");
      return;
    }
    setPhase("code");
  }

  async function confirmDelete() {
    setError(null);
    const res = await fetch("/api/account/delete/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as DeleteError) ?? "unknown");
      return;
    }
    setPhase("done");
    router.push(`/${locale}`);
    router.refresh();
  }

  const confirmWord = t.confirmWord;
  const canSend = confirmType.trim().toUpperCase() === confirmWord.toUpperCase();

  if (phase === "done") {
    return (
      <div className="mt-10 rounded-3xl border border-border/60 bg-card p-6 text-center sm:p-8">
        <p className="text-[14px]">{t.doneHeading}</p>
      </div>
    );
  }

  if (phase === "code") {
    return (
      <div className="mt-10 space-y-4 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
        <div>
          <p className="text-[14px]">{t.codeSent}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">{t.codeSentHint}</p>
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
        {error && (
          <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>
        )}
        <Button
          variant="destructive"
          size="lg"
          className="w-full rounded-full"
          disabled={code.length !== 6 || pending}
          onClick={() => startTransition(confirmDelete)}
        >
          {t.confirmDeletePermanently}
        </Button>
        <button
          type="button"
          onClick={() => {
            setPhase("idle");
            setCode("");
            setError(null);
          }}
          className="block w-full text-center text-[12px] text-muted-foreground underline-offset-4 hover:underline"
        >
          {t.cancel}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-4 rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <div>
        <Label htmlFor="confirmWord">
          {t.confirmLabel.replace("{word}", confirmWord)}
        </Label>
        <Input
          id="confirmWord"
          className="mt-2 font-mono uppercase tracking-wider"
          value={confirmType}
          onChange={(e) => setConfirmType(e.target.value)}
          placeholder={confirmWord}
          autoComplete="off"
        />
      </div>
      {error && (
        <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>
      )}
      <Button
        variant="destructive"
        size="lg"
        className="w-full rounded-full"
        disabled={!canSend || pending}
        onClick={() => startTransition(sendCode)}
      >
        {t.sendCode}
      </Button>
    </div>
  );
}
