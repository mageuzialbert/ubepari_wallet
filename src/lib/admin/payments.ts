import "server-only";

import type { Locale } from "@/i18n/config";
import { logAdmin } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { getProductsBySlugs } from "@/lib/products";
import { settlePaymentSuccess } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  PaymentKind,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/supabase/types";

const LIST_LIMIT = 150;
const MIN_REASON = 1;
const MAX_REASON = 500;

export type AdminPaymentListRow = {
  id: string;
  kind: PaymentKind;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount_tzs: number;
  evmark_ref: string | null;
  evmark_reference_id: string | null;
  created_at: string;
  settled_at: string | null;
  user: {
    id: string;
    phone: string;
    first_name: string | null;
    last_name: string | null;
  };
  order: {
    id: string;
    reference: string;
    product_name: string;
  } | null;
};

export type AdminPaymentFilters = {
  status?: PaymentStatus | "all";
  kind?: PaymentKind | "all";
  provider?: PaymentProvider | "all";
  q?: string;
  from?: string;
  to?: string;
};

export type AdminPaymentError =
  | "not_found"
  | "bad_input"
  | "wrong_status"
  | "wrong_kind"
  | "settle_failed"
  | "amount_out_of_range"
  | "unknown";

export type AdminPaymentResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AdminPaymentError; issues?: Record<string, string> };

function validateReason(raw: unknown): { ok: true; value: string } | { ok: false } {
  if (typeof raw !== "string") return { ok: false };
  const trimmed = raw.trim();
  if (trimmed.length < MIN_REASON || trimmed.length > MAX_REASON) return { ok: false };
  return { ok: true, value: trimmed };
}

function isIsoDate(raw: unknown): raw is string {
  return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

export async function listAdminPayments(
  filters: AdminPaymentFilters,
  locale: Locale,
): Promise<AdminPaymentListRow[]> {
  const admin = supabaseAdmin();
  let query = admin
    .from("payments")
    .select(
      "id, user_id, order_id, kind, provider, status, amount_tzs, evmark_ref, evmark_reference_id, created_at, settled_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  if (filters.provider && filters.provider !== "all") {
    query = query.eq("provider", filters.provider);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to && isIsoDate(filters.to)) {
    const next = new Date(`${filters.to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    query = query.lt("created_at", next.toISOString());
  }
  const q = filters.q?.trim();
  if (q && q.length > 0) {
    const pattern = `%${q.replace(/[%,]/g, "")}%`;
    query = query.or(
      `evmark_ref.ilike.${pattern},evmark_reference_id.ilike.${pattern}`,
    );
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[admin-payments] list failed", error);
    return [];
  }

  const paymentRows = rows ?? [];
  if (paymentRows.length === 0) return [];

  const userIds = Array.from(new Set(paymentRows.map((p) => p.user_id)));
  const orderIds = Array.from(
    new Set(paymentRows.map((p) => p.order_id).filter((id): id is string => !!id)),
  );

  const [{ data: profiles }, orderLookup] = await Promise.all([
    admin
      .from("profiles")
      .select("id, phone, first_name, last_name")
      .in("id", userIds),
    orderIds.length > 0
      ? admin
          .from("orders")
          .select("id, reference, product_slug")
          .in("id", orderIds)
      : Promise.resolve({ data: [] as Array<{ id: string; reference: string; product_slug: string }> }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const orderMap = new Map((orderLookup.data ?? []).map((o) => [o.id, o]));

  const slugs = Array.from(
    new Set((orderLookup.data ?? []).map((o) => o.product_slug)),
  );
  const productMap = await getProductsBySlugs(slugs, locale);

  // User/order search post-filter.
  let filtered = paymentRows;
  if (q && q.length > 0) {
    const qLower = q.toLowerCase();
    filtered = paymentRows.filter((p) => {
      const profile = profileMap.get(p.user_id);
      const order = p.order_id ? orderMap.get(p.order_id) : null;
      const name = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").toLowerCase()
        : "";
      return (
        (p.evmark_ref?.toLowerCase().includes(qLower) ?? false) ||
        (p.evmark_reference_id?.toLowerCase().includes(qLower) ?? false) ||
        (profile?.phone?.includes(qLower) ?? false) ||
        name.includes(qLower) ||
        (order?.reference.toLowerCase().includes(qLower) ?? false)
      );
    });
  }

  return filtered.map((row) => {
    const profile = profileMap.get(row.user_id);
    const order = row.order_id ? orderMap.get(row.order_id) : null;
    const product = order ? productMap.get(order.product_slug) : null;
    return {
      id: row.id,
      kind: row.kind,
      provider: row.provider,
      status: row.status,
      amount_tzs: row.amount_tzs,
      evmark_ref: row.evmark_ref,
      evmark_reference_id: row.evmark_reference_id,
      created_at: row.created_at,
      settled_at: row.settled_at,
      user: {
        id: row.user_id,
        phone: profile?.phone ?? "",
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
      },
      order: order
        ? {
            id: order.id,
            reference: order.reference,
            product_name: product?.name ?? order.product_slug,
          }
        : null,
    };
  });
}

export async function reconcilePayment(params: {
  actorId: string;
  paymentId: string;
  reason: unknown;
}): Promise<AdminPaymentResult<{ status: PaymentStatus; alreadySettled: boolean }>> {
  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) return { ok: false, error: "bad_input", issues: { reason: "length" } };

  const admin = supabaseAdmin();
  const { data: before } = await admin
    .from("payments")
    .select("id, status, kind")
    .eq("id", params.paymentId)
    .maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  if (before.status !== "pending") return { ok: false, error: "wrong_status" };

  const settle = await settlePaymentSuccess({
    paymentId: before.id,
    source: "admin_reconcile",
    evmarkRef: null,
    rawCallback: {
      source: "admin_reconcile",
      actorId: params.actorId,
      reason: (reasonCheck as { ok: true; value: string }).value,
    },
  });
  if (!settle.ok) {
    console.error("[admin-payments] reconcile settle failed", settle.error);
    return { ok: false, error: "settle_failed" };
  }

  await logAdmin({
    actorId: params.actorId,
    action: "payment.reconcile",
    targetTable: "payments",
    targetId: before.id,
    diff: {
      from: "pending",
      to: "success",
      kind: before.kind,
      reason: (reasonCheck as { ok: true; value: string }).value,
      alreadySettled: settle.alreadySettled,
    },
  });

  logEvent("admin.payment_reconciled", {
    actorId: params.actorId,
    paymentId: before.id,
  });

  return { ok: true, data: { status: "success", alreadySettled: settle.alreadySettled } };
}

export async function issueRefund(params: {
  actorId: string;
  paymentId: string;
  amount: unknown;
  reason: unknown;
}): Promise<AdminPaymentResult<{ refundPaymentId: string; amountTzs: number }>> {
  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) return { ok: false, error: "bad_input", issues: { reason: "length" } };

  const amount =
    typeof params.amount === "number" ? params.amount : Number(params.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "bad_input", issues: { amount: "range" } };
  }

  const admin = supabaseAdmin();
  const { data: original } = await admin
    .from("payments")
    .select("id, user_id, order_id, kind, provider, amount_tzs, status")
    .eq("id", params.paymentId)
    .maybeSingle();
  if (!original) return { ok: false, error: "not_found" };
  if (original.status !== "success") return { ok: false, error: "wrong_status" };
  if (original.kind === "refund") return { ok: false, error: "wrong_kind" };
  if (amount > original.amount_tzs) {
    return { ok: false, error: "amount_out_of_range", issues: { amount: "range" } };
  }

  const reason = (reasonCheck as { ok: true; value: string }).value;
  const now = new Date().toISOString();

  const { data: inserted, error: insErr } = await admin
    .from("payments")
    .insert({
      user_id: original.user_id,
      order_id: original.order_id,
      kind: "refund",
      provider: original.provider,
      amount_tzs: amount,
      status: "success",
      evmark_ref: null,
      evmark_reference_id: null,
      raw_callback: {
        source: "admin_refund",
        actorId: params.actorId,
        originalPaymentId: original.id,
        reason,
      },
      settled_at: now,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[admin-payments] refund insert failed", insErr);
    return { ok: false, error: "unknown" };
  }

  const { error: entryErr } = await admin.from("wallet_entries").insert({
    user_id: original.user_id,
    kind: "credit",
    amount_tzs: amount,
    payment_id: inserted.id,
    note_key: "refund",
    note_params: {
      originalPaymentId: original.id,
      orderId: original.order_id ?? null,
    },
  });
  if (entryErr) {
    console.error("[admin-payments] refund wallet entry failed", entryErr);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId: params.actorId,
    action: "payment.refund",
    targetTable: "payments",
    targetId: inserted.id,
    diff: {
      originalPaymentId: original.id,
      amount_tzs: amount,
      original_amount_tzs: original.amount_tzs,
      reason,
    },
  });

  logEvent("admin.payment_refunded", {
    actorId: params.actorId,
    refundPaymentId: inserted.id,
    originalPaymentId: original.id,
    amount,
  });

  return { ok: true, data: { refundPaymentId: inserted.id, amountTzs: amount } };
}

export const REFUND_REASON_BOUNDS = { min: MIN_REASON, max: MAX_REASON };
