import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, FileText } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { getAdminKycSubmission } from "@/lib/admin/kyc-data";
import { signKycDocumentUrl } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/datetime";
import { getDictionary } from "../../../dictionaries";
import { ReviewForm } from "./review-form";

type PageParams = Promise<{ locale: string; id: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.kyc.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminKycDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return null;

  const submission = await getAdminKycSubmission(id);
  if (!submission) notFound();

  const dict = await getDictionary(locale);
  const t = dict.admin.kyc;

  const docUrl = await signKycDocumentUrl(submission.id_doc_path);
  const docExt = submission.id_doc_path.split(".").pop()?.toLowerCase() ?? "";
  const isImage = docExt === "jpg" || docExt === "jpeg" || docExt === "png";

  const submittedLabel = formatDate(submission.submitted_at, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const reviewedLabel = submission.reviewed_at
    ? formatDate(submission.reviewed_at, locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isPending = submission.status === "pending";
  const isSuperseded =
    isPending &&
    submission.latest_submission_id !== null &&
    submission.latest_submission_id !== submission.id;

  const reviewable: "pending" | "approved" | "rejected" =
    submission.status === "none" ? "pending" : submission.status;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/${locale}/admin/kyc?status=${reviewable}`}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          {t.detail.back}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {submission.legal_first_name} {submission.legal_last_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          <StatusPill status={reviewable} label={t.status[reviewable]} />
          <span>·</span>
          <span>
            {t.detail.submittedAt}: {submittedLabel}
          </span>
        </div>
      </div>

      {isSuperseded ? (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 text-[13px]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p>{t.detail.supersededWarning}</p>
            {submission.latest_submission_id ? (
              <Link
                href={`/${locale}/admin/kyc/${submission.latest_submission_id}`}
                className="mt-1 inline-block text-[12px] font-medium text-amber-300 underline-offset-4 hover:underline"
              >
                {t.detail.viewNewer} →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t.detail.docHeading}
            </h2>
            {docUrl ? (
              isImage ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-background/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={docUrl}
                    alt={t.detail.docHeading}
                    className="block h-auto w-full"
                  />
                </div>
              ) : (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-5 text-[14px] transition-colors hover:bg-background"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span>{t.detail.openDoc}</span>
                </a>
              )
            ) : (
              <p className="mt-4 text-[13px] text-muted-foreground">
                {t.detail.docMissing}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t.detail.sectionIdentity}
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.detail.nida}>
                <span className="font-mono text-[13px]">
                  {submission.nida_number}
                </span>
              </Field>
              <Field label={t.detail.phone}>
                <span className="font-mono text-[13px]">
                  {submission.user_phone ?? "—"}
                </span>
              </Field>
              <Field label={t.detail.workplace}>
                {submission.workplace ?? (
                  <span className="text-muted-foreground">
                    {t.detail.workplaceEmpty}
                  </span>
                )}
              </Field>
            </dl>
          </div>

          {submission.status !== "pending" ? (
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {t.detail.sectionReview}
              </h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t.detail.reviewedAt}>{reviewedLabel ?? "—"}</Field>
                <Field label={t.detail.reviewedBy}>
                  {submission.reviewer_name ?? "—"}
                </Field>
              </dl>
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {t.detail.notes}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[14px]">
                  {submission.review_notes ?? (
                    <span className="text-muted-foreground">
                      {t.detail.noNotes}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {isPending ? (
            <ReviewForm submissionId={submission.id} locale={locale} />
          ) : (
            <div className="rounded-3xl border border-border/60 bg-card p-6 text-[13px] text-muted-foreground">
              <StatusPill status={reviewable} label={t.status[reviewable]} />
              <p className="mt-3">{t.detail.notes}: {submission.review_notes ?? "—"}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-[14px]">{children}</dd>
    </div>
  );
}

function StatusPill({
  status,
  label,
}: {
  status: "pending" | "approved" | "rejected";
  label: string;
}) {
  const tone =
    status === "approved"
      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
      : status === "rejected"
        ? "border-rose-500/40 text-rose-300 bg-rose-500/10"
        : "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${tone}`}
    >
      {label}
    </span>
  );
}
