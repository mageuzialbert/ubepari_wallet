"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary, useLocale } from "@/i18n/provider";

type Initial = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type ApiError = "invalid_email" | "name_too_long" | "unknown";

export function AccountEditForm({ initial }: { initial: Initial }) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const t = dict.account.edit;

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const errorMsg = (e: ApiError | null) =>
    e === null
      ? null
      : e === "invalid_email"
        ? t.errors.invalid_email
        : e === "name_too_long"
          ? t.errors.name_too_long
          : t.errors.unknown;

  async function save() {
    setError(null);
    setSaved(false);
    let res: Response;
    try {
      res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          email: email.trim() || null,
        }),
      });
    } catch (err) {
      console.error("[account-edit] network error", err);
      setError("unknown");
      return;
    }
    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((body.error as ApiError) ?? "unknown");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => {
      router.push(`/${locale}/account`);
    }, 600);
  }

  const dirty =
    firstName.trim() !== initial.firstName.trim() ||
    lastName.trim() !== initial.lastName.trim() ||
    email.trim() !== initial.email.trim();

  return (
    <form
      className="space-y-6 rounded-3xl border border-border/60 bg-card p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(save);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="first">{t.firstNameLabel}</Label>
          <Input
            id="first"
            className="mt-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            maxLength={60}
          />
        </div>
        <div>
          <Label htmlFor="last">{t.lastNameLabel}</Label>
          <Input
            id="last"
            className="mt-2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            maxLength={60}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          className="mt-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t.emailHint}</p>
      </div>

      <div>
        <Label htmlFor="phone">{t.phoneLabel}</Label>
        <Input
          id="phone"
          value={`+${initial.phone}`}
          readOnly
          disabled
          className="mt-2 font-mono"
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t.phoneHint}</p>
      </div>

      {error && (
        <p className="text-center text-[12px] text-destructive">
          {errorMsg(error)}
        </p>
      )}
      {saved && (
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t.success}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          className="flex-1 rounded-full"
          size="lg"
          disabled={pending || !dirty}
        >
          {t.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-full"
          onClick={() => router.push(`/${locale}/account`)}
          disabled={pending}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
