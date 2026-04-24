import "server-only";

import { logEvent } from "@/lib/events";
import { completeGoalIfReached } from "@/lib/goals";
import { decrementStockForOrder } from "@/lib/inventory";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GoalsRow } from "@/lib/supabase/types";

const PENDING_WINDOW_SECONDS = 120;

// Returns true if the user has any payment row in status='pending' created
// within the last PENDING_WINDOW_SECONDS. Prevents a second push stacking on
// top of one the user is still confirming on their phone.
export async function hasPendingPush(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - PENDING_WINDOW_SECONDS * 1000).toISOString();
  const { data } = await supabaseAdmin()
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gt("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export type SettleSource = "callback" | "admin_reconcile" | "admin_activate";

export type SettleResult =
  | { ok: true; alreadySettled: boolean }
  | { ok: false; error: string };

// Shared success path for the Evmark callback, admin reconcile, and admin
// manual-activate. Re-reads the payment row so callers can't lie about
// amounts, and short-circuits when the payment is already settled so each
// call is idempotent.
export async function settlePaymentSuccess(params: {
  paymentId: string;
  source: SettleSource;
  evmarkRef?: string | null;
  rawCallback?: Record<string, unknown> | null;
}): Promise<SettleResult> {
  const admin = supabaseAdmin();

  const { data: payment, error } = await admin
    .from("payments")
    .select("id, user_id, order_id, goal_id, kind, amount_tzs, status")
    .eq("id", params.paymentId)
    .maybeSingle();
  if (error) return { ok: false, error: `lookup_error: ${error.message}` };
  if (!payment) return { ok: false, error: "payment_not_found" };

  if (payment.status === "success" || payment.status === "failed") {
    return { ok: true, alreadySettled: true };
  }

  const settledAt = new Date().toISOString();

  const { error: payUpdErr } = await admin
    .from("payments")
    .update({
      status: "success",
      settled_at: settledAt,
      evmark_ref: params.evmarkRef ?? undefined,
      raw_callback: params.rawCallback ?? undefined,
    })
    .eq("id", payment.id);
  if (payUpdErr) {
    return { ok: false, error: `payment_update_error: ${payUpdErr.message}` };
  }

  if (payment.goal_id && payment.kind === "contribution") {
    const { data: updatedGoal, error: rpcErr } = await admin.rpc(
      "increment_goal_contribution",
      { p_goal_id: payment.goal_id, p_amount: payment.amount_tzs },
    );
    if (rpcErr || !updatedGoal) {
      logEvent("goal.contribution.rpc_failed", {
        paymentId: payment.id,
        goalId: payment.goal_id,
        error: rpcErr?.message ?? "no_goal_returned",
      });
    }

    const goal = updatedGoal as GoalsRow | null;
    const noteParams = {
      goalId: payment.goal_id,
      goalReference: goal?.reference ?? null,
      productSlug: goal?.product_slug ?? null,
    };

    // Money trio: MNO cash landed -> Available, swept into Allocated(goal).
    // Modeled as credit+debit on Available + credit on Allocated so the
    // Wallet UI shows the top-up arriving and then being earmarked.
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "credit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "available",
      allocation_goal_id: null,
      note_key: "contribution",
      note_params: noteParams,
    });
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "debit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "available",
      allocation_goal_id: null,
      note_key: "allocate_out",
      note_params: noteParams,
    });
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "credit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "allocated",
      allocation_goal_id: payment.goal_id,
      note_key: "contribution",
      note_params: noteParams,
    });

    if (goal) {
      await completeGoalIfReached(goal);
    }
  } else if (payment.kind === "deposit" && payment.order_id) {
    // Legacy hire-purchase path. No new rows are being written with kind='deposit'
    // after the layaway pivot, but old in-flight pushes still settle here.
    const { data: orderRow } = await admin
      .from("orders")
      .update({ status: "active", activated_at: settledAt })
      .eq("id", payment.order_id)
      .select("reference")
      .maybeSingle();
    const orderRef = orderRow?.reference ?? payment.order_id;

    await decrementStockForOrder(payment.order_id);

    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "credit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "available",
      allocation_goal_id: null,
      note_key: "deposit",
      note_params: { orderId: orderRef },
    });
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "debit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "available",
      allocation_goal_id: null,
      note_key: "deposit",
      note_params: { orderId: orderRef },
    });
  } else if (payment.kind === "topup") {
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "credit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "available",
      allocation_goal_id: null,
      note_key: "topup",
      note_params: {},
    });
  } else if (payment.kind === "installment" && payment.order_id) {
    const { data: orderRow } = await admin
      .from("orders")
      .select("reference")
      .eq("id", payment.order_id)
      .maybeSingle();
    const orderRef = orderRow?.reference ?? payment.order_id;

    await admin
      .from("order_installments")
      .update({ paid_at: settledAt, payment_id: payment.id })
      .eq("order_id", payment.order_id)
      .is("paid_at", null)
      .order("sequence", { ascending: true })
      .limit(1);

    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "debit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      bucket: "available",
      allocation_goal_id: null,
      note_key: "payment",
      note_params: { orderId: orderRef },
    });
  }

  logEvent("payment.settled", {
    paymentId: payment.id,
    kind: payment.kind,
    orderId: payment.order_id,
    goalId: payment.goal_id,
    amount: payment.amount_tzs,
    status: "success",
    source: params.source,
    evmarkRef: params.evmarkRef ?? null,
  });

  return { ok: true, alreadySettled: false };
}
