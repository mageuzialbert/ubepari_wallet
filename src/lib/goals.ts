import "server-only";

import { randomInt } from "node:crypto";

import { logEvent } from "@/lib/events";
import { computeMonthlyTarget, GOAL_TERMS, type GoalTerm } from "@/lib/goal";
import { getProduct } from "@/lib/products";
import { sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GoalsRow } from "@/lib/supabase/types";
import { defaultLocale } from "@/i18n/config";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_ACTIVE_GOALS_DEFAULT = 3;

export function maxActiveGoals(): number {
  const raw = process.env.NEXT_PUBLIC_MAX_ACTIVE_GOALS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : MAX_ACTIVE_GOALS_DEFAULT;
}

function randomRef(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return out;
}

export function newGoalReference(): string {
  return `G-${randomRef(8)}`;
}

export function newReceiptNumber(): string {
  const d = new Date();
  const eat = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const y = eat.getUTCFullYear();
  const m = String(eat.getUTCMonth() + 1).padStart(2, "0");
  const day = String(eat.getUTCDate()).padStart(2, "0");
  return `UBE-${y}${m}${day}-${randomRef(4)}`;
}

function addOneMonth(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const month = d.getUTCMonth();
  d.setUTCMonth(month + 1);
  // if rollover landed on the 1st of a later month (shorter months), step back
  if (d.getUTCMonth() !== (month + 1) % 12) {
    d.setUTCDate(0);
  }
  return d.toISOString().slice(0, 10);
}

export function nextReminderFrom(startIso: string): string {
  return addOneMonth(startIso);
}

export type CreateGoalInput = {
  userId: string;
  productSlug: string;
  termMonths: GoalTerm;
};

export type CreateGoalResult =
  | { ok: true; goal: GoalsRow; monthlyTarget: number }
  | { ok: false; code: "kyc_not_approved" | "product_not_found" | "too_many_active" | "profile_missing" | "db_error"; detail?: string };

export async function createGoal(input: CreateGoalInput): Promise<CreateGoalResult> {
  const admin = supabaseAdmin();

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("kyc_status")
    .eq("id", input.userId)
    .maybeSingle();
  if (profileErr) return { ok: false, code: "db_error", detail: profileErr.message };
  if (!profile) return { ok: false, code: "profile_missing" };
  if (profile.kyc_status !== "approved") return { ok: false, code: "kyc_not_approved" };

  const { count, error: countErr } = await admin
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("status", "active");
  if (countErr) return { ok: false, code: "db_error", detail: countErr.message };
  if ((count ?? 0) >= maxActiveGoals()) return { ok: false, code: "too_many_active" };

  const product = await getProduct(input.productSlug, defaultLocale);
  if (!product) return { ok: false, code: "product_not_found" };

  if (!GOAL_TERMS.includes(input.termMonths)) {
    return { ok: false, code: "db_error", detail: "invalid_term" };
  }
  const monthlyTarget = computeMonthlyTarget(product.priceTzs, input.termMonths);
  const reference = newGoalReference();
  const today = new Date().toISOString().slice(0, 10);
  const nextReminder = nextReminderFrom(today);

  const { data: goal, error: goalErr } = await admin
    .from("goals")
    .insert({
      user_id: input.userId,
      product_slug: input.productSlug,
      product_price_tzs: product.priceTzs,
      target_months: input.termMonths,
      monthly_target_tzs: monthlyTarget,
      reference,
      next_reminder_date: nextReminder,
    })
    .select("*")
    .single();
  if (goalErr || !goal) {
    return { ok: false, code: "db_error", detail: goalErr?.message ?? "insert failed" };
  }

  logEvent("goal.created", {
    userId: input.userId,
    goalId: goal.id,
    reference,
    productSlug: input.productSlug,
    termMonths: input.termMonths,
    monthlyTarget,
    priceTzs: product.priceTzs,
  });

  return { ok: true, goal: goal as GoalsRow, monthlyTarget };
}

export async function listGoalsForUser(userId: string): Promise<GoalsRow[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as GoalsRow[];
}

export type GoalDetail = {
  goal: GoalsRow;
  contributions: Array<{
    id: string;
    amount_tzs: number;
    status: "pending" | "success" | "failed";
    provider: string;
    evmark_reference_id: string | null;
    created_at: string;
    settled_at: string | null;
  }>;
};

export async function getGoalDetail(
  userId: string,
  goalId: string,
): Promise<GoalDetail | null> {
  const admin = supabaseAdmin();
  const { data: goal } = await admin
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!goal) return null;

  const { data: payments } = await admin
    .from("payments")
    .select("id, amount_tzs, status, provider, evmark_reference_id, created_at, settled_at")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });

  return {
    goal: goal as GoalsRow,
    contributions: (payments ?? []) as GoalDetail["contributions"],
  };
}

export type CancelGoalResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "not_active" | "db_error"; detail?: string };

export async function cancelGoal(
  userId: string,
  goalId: string,
  reason: string | null,
): Promise<CancelGoalResult> {
  const admin = supabaseAdmin();

  const { data, error } = await admin.rpc("cancel_goal_and_refund", {
    p_goal_id: goalId,
    p_user_id: userId,
    p_reason: reason,
  });

  if (error) {
    if (error.message.includes("not_active")) {
      // Disambiguate: either the goal doesn't exist for this user, or it exists
      // but isn't active. Cheap second read since the RPC failed fast anyway.
      const { data: exists } = await admin
        .from("goals")
        .select("id")
        .eq("id", goalId)
        .eq("user_id", userId)
        .maybeSingle();
      return { ok: false, code: exists ? "not_active" : "not_found" };
    }
    return { ok: false, code: "db_error", detail: error.message };
  }

  const refundedTzs = (data as GoalsRow | null) ? 0 : 0; // contributed_tzs is zeroed in the RPC
  logEvent("goal.cancelled", { userId, goalId, reason, refundedTzs });
  return { ok: true };
}

// Shared completion path — called from settlement (payments.ts) and allocate
// (api/wallet/allocate/route.ts) after contributed_tzs may have hit target.
// Guards `status='active'` at the database level so the path is safe to call
// concurrently. Writes the close-out debit against Allocated so the goal's
// money leaves the user's wallet cleanly.
export type CompleteGoalResult =
  | { kind: "completed"; goal: GoalsRow }
  | { kind: "not_reached"; goal: GoalsRow }
  | { kind: "already_completed"; goal: GoalsRow };

export async function completeGoalIfReached(goal: GoalsRow): Promise<CompleteGoalResult> {
  if (goal.status !== "active") return { kind: "already_completed", goal };
  if (goal.contributed_tzs < goal.product_price_tzs) {
    return { kind: "not_reached", goal };
  }

  const admin = supabaseAdmin();
  const completedAt = new Date().toISOString();
  const receiptNumber = newReceiptNumber();

  const { data: updated } = await admin
    .from("goals")
    .update({
      status: "completed",
      completed_at: completedAt,
      receipt_number: receiptNumber,
      receipt_issued_at: completedAt,
    })
    .eq("id", goal.id)
    .eq("status", "active")
    .select("*")
    .maybeSingle();

  if (!updated) {
    // Lost the race — another path already flipped it. Return the current row.
    const { data: current } = await admin
      .from("goals")
      .select("*")
      .eq("id", goal.id)
      .maybeSingle();
    return { kind: "already_completed", goal: (current as GoalsRow) ?? goal };
  }

  const finalGoal = updated as GoalsRow;

  // Close-out debit: the Allocated bucket returns to zero for this goal.
  // Money leaves the user's wallet and is conceptually paid to Ubepari PC.
  await admin.from("wallet_entries").insert({
    user_id: finalGoal.user_id,
    kind: "debit",
    amount_tzs: finalGoal.product_price_tzs,
    bucket: "allocated",
    allocation_goal_id: finalGoal.id,
    note_key: "goal_completed",
    note_params: {
      goalId: finalGoal.id,
      goalReference: finalGoal.reference,
      productSlug: finalGoal.product_slug,
      receiptNumber: finalGoal.receipt_number,
    },
  });

  logEvent("goal.completed", {
    goalId: finalGoal.id,
    userId: finalGoal.user_id,
    receiptNumber: finalGoal.receipt_number,
  });

  // fire-and-forget SMS so caller latency stays low
  void sendGoalCompletedSms(finalGoal).catch((err) =>
    logEvent("goal.completion_sms_failed", {
      goalId: finalGoal.id,
      error: err instanceof Error ? err.message : String(err),
    }),
  );

  return { kind: "completed", goal: finalGoal };
}

// Fire-and-forget SMS sent when a goal auto-completes. Called from settlement.
export async function sendGoalCompletedSms(goal: GoalsRow): Promise<void> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("phone, first_name")
    .eq("id", goal.user_id)
    .maybeSingle();
  if (!profile?.phone) return;

  const product = await getProduct(goal.product_slug, defaultLocale).catch(() => null);
  const productName = product?.name ?? goal.product_slug;
  const firstName = profile.first_name ?? "";

  const text =
    `Hongera ${firstName}! Umefikia lengo lako la ${productName}. ` +
    `Pakua risiti yako (${goal.receipt_number ?? ""}) ndani ya Ubepari app, ` +
    `kisha fika Ubepari PC Magomeni Mapipa kuichukua.`;

  await sendSms(profile.phone, text);
}
