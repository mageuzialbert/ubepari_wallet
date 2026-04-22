import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { KycStatus } from "@/lib/supabase/types";

const LIST_LIMIT = 100;

export type AdminKycListRow = {
  id: string;
  user_id: string;
  legal_first_name: string;
  legal_last_name: string;
  nida_number: string;
  workplace: string | null;
  status: KycStatus;
  submitted_at: string;
  reviewed_at: string | null;
};

export type AdminKycDetail = {
  id: string;
  user_id: string;
  legal_first_name: string;
  legal_last_name: string;
  nida_number: string;
  workplace: string | null;
  id_doc_path: string;
  status: KycStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  user_phone: string | null;
  reviewer_name: string | null;
  latest_submission_id: string | null;
};

export async function listAdminKycSubmissions(
  status: KycStatus,
): Promise<AdminKycListRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("kyc_submissions")
    .select(
      "id, user_id, legal_first_name, legal_last_name, nida_number, workplace, status, submitted_at, reviewed_at",
    )
    .eq("status", status)
    .order("submitted_at", { ascending: status === "pending" })
    .limit(LIST_LIMIT);

  if (error) {
    console.error("[admin-kyc] list failed", { status, error: error.message });
    return [];
  }
  return data ?? [];
}

export async function getAdminKycSubmission(
  id: string,
): Promise<AdminKycDetail | null> {
  const admin = supabaseAdmin();
  const { data: row, error } = await admin
    .from("kyc_submissions")
    .select(
      "id, user_id, legal_first_name, legal_last_name, nida_number, workplace, id_doc_path, status, submitted_at, reviewed_at, reviewed_by, review_notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-kyc] detail failed", { id, error: error.message });
    return null;
  }
  if (!row) return null;

  const [{ data: userProfile }, latest, reviewerName] = await Promise.all([
    admin.from("profiles").select("phone").eq("id", row.user_id).maybeSingle(),
    admin
      .from("kyc_submissions")
      .select("id")
      .eq("user_id", row.user_id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    row.reviewed_by ? loadReviewerName(row.reviewed_by) : Promise.resolve(null),
  ]);

  return {
    ...row,
    user_phone: userProfile?.phone ?? null,
    reviewer_name: reviewerName,
    latest_submission_id: latest.data?.id ?? null,
  };
}

export async function listKycForUser(userId: string): Promise<AdminKycListRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("kyc_submissions")
    .select(
      "id, user_id, legal_first_name, legal_last_name, nida_number, workplace, status, submitted_at, reviewed_at",
    )
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[admin-kyc] list-for-user failed", { userId, error: error.message });
    return [];
  }
  return data ?? [];
}

async function loadReviewerName(reviewerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", reviewerId)
    .maybeSingle();
  if (!data) return null;
  const display = [data.first_name, data.last_name].filter(Boolean).join(" ");
  return display || data.phone || null;
}
