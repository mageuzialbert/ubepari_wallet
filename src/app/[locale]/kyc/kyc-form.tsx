"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary, useLocale } from "@/i18n/provider";

type KycError =
  | "invalid_nida"
  | "missing_name"
  | "missing_doc"
  | "doc_too_large"
  | "doc_type"
  | "unknown";

export function KycForm() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const t = dict.kyc;

  const fileInput = useRef<HTMLInputElement>(null);
  const [nida, setNida] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<KycError | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const errorMsg = (e: KycError | null) =>
    e === null
      ? null
      : e === "invalid_nida"
        ? t.errorInvalidNida
        : e === "missing_name"
          ? t.errorMissingName
          : e === "missing_doc"
            ? t.errorMissingDoc
            : e === "doc_too_large"
              ? t.errorDocTooLarge
              : e === "doc_type"
                ? t.errorDocType
                : t.errorGeneric;

  async function submit() {
    setError(null);
    if (!file) {
      setError("missing_doc");
      return;
    }
    const form = new FormData();
    form.set("nida", nida);
    form.set("firstName", firstName);
    form.set("lastName", lastName);
    form.set("workplace", workplace);
    form.set("doc", file);

    let res: Response;
    try {
      res = await fetch("/api/kyc/submit", {
        method: "POST",
        body: form,
      });
    } catch (err) {
      console.error("[kyc-submit] network error", err);
      setError("unknown");
      return;
    }
    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (body && body.detail) console.error("[kyc-submit]", body);
      setError((body.error as KycError) ?? "unknown");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-4 text-[15px]">{t.submitted}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6 rounded-3xl border border-border/60 bg-card p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(submit);
      }}
    >
      <div>
        <Label htmlFor="nida">{t.nidaLabel}</Label>
        <Input
          id="nida"
          placeholder={t.nidaPlaceholder}
          className="mt-2 font-mono"
          inputMode="numeric"
          value={nida}
          onChange={(e) => setNida(e.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t.nidaHint}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="first">{t.legalFirstName}</Label>
          <Input
            id="first"
            className="mt-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>
        <div>
          <Label htmlFor="last">{t.legalLastName}</Label>
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
        <Label>{t.uploadLabel}</Label>
        <div className="mt-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-background/50 p-8 text-center">
          <div>
            <FileUp className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-[14px] font-medium">
              {file ? file.name : t.uploadDrop}
            </p>
            <p className="text-[12px] text-muted-foreground">{t.uploadFormats}</p>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 rounded-full"
              onClick={() => fileInput.current?.click()}
            >
              {t.uploadChoose}
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="workplace">{t.workplaceLabel}</Label>
        <Input
          id="workplace"
          placeholder={t.workplacePlaceholder}
          className="mt-2"
          value={workplace}
          onChange={(e) => setWorkplace(e.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t.workplaceHint}</p>
      </div>

      {error && <p className="text-center text-[12px] text-destructive">{errorMsg(error)}</p>}

      <Button
        className="w-full rounded-full"
        size="lg"
        disabled={
          pending ||
          !/^\d{20}$/.test(nida.replace(/[\s-]/g, "")) ||
          !firstName.trim() ||
          !lastName.trim() ||
          !file
        }
      >
        {t.submit}
      </Button>
    </form>
  );
}
