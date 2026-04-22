"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

type ApiError =
  | "bad_input"
  | "not_found"
  | "forbidden"
  | "self_edit_forbidden"
  | "root_demotion_forbidden"
  | "unauthenticated"
  | "unknown";

export function AdminRoleForm({
  userId,
  locale,
  isAdmin,
}: {
  userId: string;
  locale: Locale;
  isAdmin: boolean;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.users;

  const grant = !isAdmin;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    setIssues({});
    setSaved(false);

    let res: Response;
    try {
      res = await fetch(`/api/admin/users/${userId}/admin-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant, reason }),
      });
    } catch (err) {
      console.error("[admin-role-form] network error", err);
      setError("unknown");
      return;
    }

    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: ApiError;
      issues?: Record<string, string>;
    };

    if (!res.ok || !body.ok) {
      setError(body.error ?? "unknown");
      if (body.issues) setIssues(body.issues);
      return;
    }

    setSaved(true);
    setReason("");
    startTransition(() => router.refresh());
  }

  const topMessage = errorMessage(error, t);
  const reasonIssue = issues.reason ? t.toast.reasonRequired : null;

  return (
    <form
      className="rounded-3xl border border-border/60 bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(submit);
      }}
    >
      <h3 className="text-[13px] font-semibold tracking-tight">{t.adminRole.title}</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {grant ? t.adminRole.grantAction : t.adminRole.revokeAction}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <Label className="text-[12px]">{t.adminRole.reasonLabel}</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t.adminRole.reasonPlaceholder}
            required
            className="mt-1.5 w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{t.adminRole.reasonHint}</p>
          {reasonIssue ? (
            <p className="mt-1 text-[11px] text-destructive">{reasonIssue}</p>
          ) : null}
        </div>

        {topMessage ? (
          <p className="text-[12px] text-destructive">{topMessage}</p>
        ) : null}
        {saved ? (
          <p className="text-[12px] text-emerald-400">
            {grant ? t.toast.adminGranted : t.toast.adminRevoked}
          </p>
        ) : null}

        <Button
          type="submit"
          variant={grant ? "default" : "outline"}
          className={`rounded-full ${grant ? "" : "text-destructive"}`}
          disabled={pending || reason.trim().length === 0}
        >
          {grant ? t.adminRole.grantSubmit : t.adminRole.revokeSubmit}
        </Button>
      </div>
    </form>
  );
}

function errorMessage(
  err: string | null,
  t: ReturnType<typeof useDictionary>["admin"]["users"],
): string | null {
  if (!err) return null;
  switch (err as ApiError) {
    case "bad_input":
      return t.toast.validation;
    case "forbidden":
      return t.toast.forbidden;
    case "self_edit_forbidden":
      return t.toast.selfForbidden;
    case "root_demotion_forbidden":
      return t.toast.rootForbidden;
    case "not_found":
      return t.toast.notFound;
    case "unauthenticated":
      return t.toast.unauthenticated;
    default:
      return t.toast.error;
  }
}
