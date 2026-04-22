import "server-only";

import { logAdmin } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { KycStatus } from "@/lib/supabase/types";

const SMS_APPROVED = "Ubepari: KYC approved. You can now place orders.";
const SMS_REJECTED = "Ubepari: KYC rejected. Open the app for details.";

export type ReviewAction = "approve" | "reject";

export type ReviewKycResult =
  | { ok: true; smsFailed: boolean }
  | { ok: false; error: ReviewKycError };

export type ReviewKycError =
  | "not_found"
  | "self_review_forbidden"
  | "already_reviewed"
  | "notes_required"
  | "profile_sync_failed"
  | "unknown";

export async function reviewKyc(params: {
  actorId: string;
  submissionId: string;
  action: ReviewAction;
  notes: string | null;
}): Promise<ReviewKycResult> {
  const { actorId, submissionId, action, notes } = params;

  if (action === "reject" && !(notes && notes.trim().length > 0)) {
    return { ok: false, error: "notes_required" };
  }

  const admin = supabaseAdmin();

  const { data: submission, error: loadErr } = await admin
    .from("kyc_submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (loadErr) {
    console.error("[admin-kyc-review] load failed", loadErr);
    return { ok: false, error: "unknown" };
  }
  if (!submission) return { ok: false, error: "not_found" };
  if (submission.user_id === actorId) {
    return { ok: false, error: "self_review_forbidden" };
  }

  const newStatus: KycStatus = action === "approve" ? "approved" : "rejected";
  const trimmedNotes = notes ? notes.trim().slice(0, 500) : null;

  const { data: updated, error: updateErr } = await admin
    .from("kyc_submissions")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
      review_notes: trimmedNotes,
    })
    .eq("id", submissionId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    console.error("[admin-kyc-review] update failed", updateErr);
    return { ok: false, error: "unknown" };
  }
  if (!updated) return { ok: false, error: "already_reviewed" };

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ kyc_status: newStatus })
    .eq("id", submission.user_id);

  if (profileErr) {
    console.error("[admin-kyc-review] profile sync failed", profileErr);
    logEvent("kyc.profile_sync_failed", {
      submissionId,
      userId: submission.user_id,
      actorId,
    });
    return { ok: false, error: "profile_sync_failed" };
  }

  await logAdmin({
    actorId,
    action: action === "approve" ? "kyc.approve" : "kyc.reject",
    targetTable: "kyc_submissions",
    targetId: submissionId,
    diff: {
      status: { from: "pending", to: newStatus },
      notes: trimmedNotes,
    },
  });

  logEvent(action === "approve" ? "kyc.approved" : "kyc.rejected", {
    submissionId,
    userId: submission.user_id,
    actorId,
  });

  const { data: userProfile } = await admin
    .from("profiles")
    .select("phone")
    .eq("id", submission.user_id)
    .maybeSingle();

  let smsFailed = false;
  if (userProfile?.phone) {
    const text = action === "approve" ? SMS_APPROVED : SMS_REJECTED;
    const result = await sendSms(userProfile.phone, text);
    if (!result.ok) {
      smsFailed = true;
      logEvent("kyc.sms_failed", {
        submissionId,
        userId: submission.user_id,
        reason: result.reason,
      });
    }
  } else {
    smsFailed = true;
    logEvent("kyc.sms_failed", {
      submissionId,
      userId: submission.user_id,
      reason: "no-phone-on-profile",
    });
  }

  return { ok: true, smsFailed };
}
