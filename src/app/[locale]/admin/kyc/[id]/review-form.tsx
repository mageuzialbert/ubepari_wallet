"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

type Mode = "idle" | "approving" | "rejecting";

type ApiError =
  | "not_found"
  | "self_review_forbidden"
  | "already_reviewed"
  | "notes_required"
  | "profile_sync_failed"
  | "unknown"
  | "bad_request"
  | "unauthenticated"
  | "forbidden";

export function ReviewForm({
  submissionId,
  locale,
}: {
  submissionId: string;
  locale: Locale;
}) {
  const dict = useDictionary();
  const router = useRouter();
  const t = dict.admin.kyc;

  const [mode, setMode] = useState<Mode>("idle");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode("idle");
    setNotes("");
    setError(null);
  }

  async function submit(action: "approve" | "reject") {
    setError(null);
    if (action === "reject" && notes.trim().length === 0) {
      setError(t.toast.notesRequired);
      return;
    }

    let res: Response;
    try {
      res = await fetch(`/api/admin/kyc/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: action === "reject" ? notes.trim() : null,
        }),
      });
    } catch (err) {
      console.error("[admin-kyc-review] network error", err);
      setError(t.toast.error);
      return;
    }

    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      smsFailed?: boolean;
      error?: ApiError;
    };

    if (!res.ok || !body.ok) {
      setError(messageFor(body.error, t));
      return;
    }

    if (body.smsFailed) {
      window.alert(t.toast.smsFailed);
    }

    startTransition(() => {
      router.push(`/${locale}/admin/kyc?status=${action === "approve" ? "approved" : "rejected"}`);
      router.refresh();
    });
  }

  if (mode === "idle") {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {t.actions.approve} / {t.actions.reject}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Button
            type="button"
            className="w-full rounded-full"
            onClick={() => setMode("approving")}
          >
            {t.actions.approve}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={() => setMode("rejecting")}
          >
            {t.actions.reject}
          </Button>
        </div>
        {error ? (
          <p className="mt-4 text-[12px] text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  if (mode === "approving") {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-6">
        <h3 className="text-[15px] font-semibold tracking-tight">
          {t.approve.confirmTitle}
        </h3>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {t.approve.confirmBody}
        </p>
        {error ? (
          <p className="mt-3 text-[12px] text-destructive">{error}</p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            className="w-full rounded-full"
            disabled={pending}
            onClick={() => submit("approve")}
          >
            {t.approve.submit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-full"
            disabled={pending}
            onClick={reset}
          >
            {t.actions.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6">
      <h3 className="text-[15px] font-semibold tracking-tight">
        {t.reject.confirmTitle}
      </h3>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {t.reject.confirmBody}
      </p>
      <label
        className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
        htmlFor="review-notes"
      >
        {t.reject.notesLabel}
      </label>
      <textarea
        id="review-notes"
        rows={4}
        maxLength={500}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t.reject.notesPlaceholder}
        className="mt-2 w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t.reject.notesHint}
      </p>
      {error ? (
        <p className="mt-3 text-[12px] text-destructive">{error}</p>
      ) : null}
      <div className="mt-5 flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full"
          disabled={pending}
          onClick={() => submit("reject")}
        >
          {t.reject.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-full"
          disabled={pending}
          onClick={reset}
        >
          {t.actions.cancel}
        </Button>
      </div>
    </div>
  );
}

function messageFor(
  err: ApiError | undefined,
  t: ReturnType<typeof useDictionary>["admin"]["kyc"],
): string {
  switch (err) {
    case "self_review_forbidden":
      return t.toast.selfReview;
    case "already_reviewed":
      return t.toast.alreadyReviewed;
    case "notes_required":
      return t.toast.notesRequired;
    case "profile_sync_failed":
      return t.toast.profileSyncFailed;
    default:
      return t.toast.error;
  }
}
