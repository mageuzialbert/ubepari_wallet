import "server-only";

import type { Locale } from "@/i18n/config";
import { logAdmin } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { getProduct, getProductsBySlugs } from "@/lib/products";
import { settlePaymentSuccess } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  OrderStatus,
  PaymentKind,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/supabase/types";

const LIST_LIMIT = 100;
const MIN_REASON = 1;
const MAX_REASON = 500;

export type AdminOrderListRow = {
  id: string;
  reference: string;
  status: OrderStatus;
  total_tzs: number;
  deposit_tzs: number;
  monthly_tzs: number;
  plan_months: number;
  created_at: string;
  user: {
    id: string;
    phone: string;
    first_name: string | null;
    last_name: string | null;
  };
  product: {
    slug: string;
    name: string;
    image: string;
  };
};

export type AdminOrderDetail = {
  id: string;
  reference: string;
  status: OrderStatus;
  termMonths: number;
  cashPriceTzs: number;
  depositTzs: number;
  financedTzs: number;
  serviceFeeTzs: number;
  totalTzs: number;
  monthlyTzs: number;
  createdAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  user: {
    id: string;
    phone: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  product: {
    slug: string;
    name: string;
    brand: string;
    tagline: string;
    image: string;
  };
  installments: {
    id: string;
    sequence: number;
    dueDate: string;
    amountTzs: number;
    paidAt: string | null;
  }[];
  payments: {
    id: string;
    kind: PaymentKind;
    provider: PaymentProvider;
    amountTzs: number;
    status: PaymentStatus;
    evmarkRef: string | null;
    createdAt: string;
    settledAt: string | null;
  }[];
  pendingDepositPaymentId: string | null;
};

export type AdminOrderFilters = {
  status?: OrderStatus | "all";
  q?: string;
  from?: string;
  to?: string;
};

export type AdminOrderError =
  | "not_found"
  | "bad_input"
  | "wrong_status"
  | "no_pending_deposit"
  | "settle_failed"
  | "unknown";

export type AdminOrderResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AdminOrderError; issues?: Record<string, string> };

function validateReason(raw: unknown): { ok: true; value: string } | { ok: false } {
  if (typeof raw !== "string") return { ok: false };
  const trimmed = raw.trim();
  if (trimmed.length < MIN_REASON || trimmed.length > MAX_REASON) return { ok: false };
  return { ok: true, value: trimmed };
}

function isIsoDate(raw: unknown): raw is string {
  return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

export async function listAdminOrders(
  filters: AdminOrderFilters,
  locale: Locale,
): Promise<AdminOrderListRow[]> {
  const admin = supabaseAdmin();
  let query = admin
    .from("orders")
    .select(
      "id, user_id, product_slug, reference, status, total_tzs, deposit_tzs, monthly_tzs, plan_months, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    // Inclusive upper bound: add a day to the provided YYYY-MM-DD.
    if (isIsoDate(filters.to)) {
      const next = new Date(`${filters.to}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.lt("created_at", next.toISOString());
    }
  }
  const q = filters.q?.trim();
  if (q && q.length > 0) {
    const pattern = `%${q.replace(/[%,]/g, "")}%`;
    query = query.or(`reference.ilike.${pattern},product_slug.ilike.${pattern}`);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("[admin-orders] list failed", error);
    return [];
  }

  const orderRows = rows ?? [];
  if (orderRows.length === 0) return [];

  const userIds = Array.from(new Set(orderRows.map((o) => o.user_id)));
  const slugs = Array.from(new Set(orderRows.map((o) => o.product_slug)));

  const [{ data: profiles }, productMap] = await Promise.all([
    admin
      .from("profiles")
      .select("id, phone, first_name, last_name")
      .in("id", userIds),
    getProductsBySlugs(slugs, locale),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // User search — post-filter since Supabase doesn't let us OR across tables.
  let filtered = orderRows;
  if (q && q.length > 0) {
    const qLower = q.toLowerCase();
    filtered = orderRows.filter((o) => {
      const profile = profileMap.get(o.user_id);
      if (!profile) return true;
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").toLowerCase();
      const matchesUser =
        profile.phone.includes(qLower) ||
        name.includes(qLower) ||
        o.reference.toLowerCase().includes(qLower) ||
        o.product_slug.toLowerCase().includes(qLower);
      return matchesUser;
    });
  }

  return filtered.map((row) => {
    const profile = profileMap.get(row.user_id);
    const product = productMap.get(row.product_slug);
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      total_tzs: row.total_tzs,
      deposit_tzs: row.deposit_tzs,
      monthly_tzs: row.monthly_tzs,
      plan_months: row.plan_months,
      created_at: row.created_at,
      user: {
        id: row.user_id,
        phone: profile?.phone ?? "",
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
      },
      product: {
        slug: row.product_slug,
        name: product?.name ?? row.product_slug,
        image: product?.images[0] ?? "",
      },
    };
  });
}

export async function getAdminOrder(
  orderId: string,
  locale: Locale,
): Promise<AdminOrderDetail | null> {
  const admin = supabaseAdmin();
  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, user_id, product_slug, reference, status, plan_months, cash_price_tzs, deposit_tzs, financed_tzs, service_fee_tzs, total_tzs, monthly_tzs, created_at, activated_at, completed_at",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[admin-orders] detail failed", error);
    return null;
  }
  if (!order) return null;

  const [profileRes, installmentsRes, paymentsRes, product] = await Promise.all([
    admin
      .from("profiles")
      .select("id, phone, first_name, last_name, email")
      .eq("id", order.user_id)
      .maybeSingle(),
    admin
      .from("order_installments")
      .select("id, sequence, due_date, amount_tzs, paid_at")
      .eq("order_id", order.id)
      .order("sequence", { ascending: true }),
    admin
      .from("payments")
      .select("id, kind, provider, amount_tzs, status, evmark_ref, created_at, settled_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
    getProduct(order.product_slug, locale),
  ]);

  const payments = paymentsRes.data ?? [];
  const pendingDeposit = payments.find(
    (p) => p.kind === "deposit" && p.status === "pending",
  );

  const profile = profileRes.data;

  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    termMonths: order.plan_months,
    cashPriceTzs: order.cash_price_tzs,
    depositTzs: order.deposit_tzs,
    financedTzs: order.financed_tzs,
    serviceFeeTzs: order.service_fee_tzs,
    totalTzs: order.total_tzs,
    monthlyTzs: order.monthly_tzs,
    createdAt: order.created_at,
    activatedAt: order.activated_at,
    completedAt: order.completed_at,
    user: {
      id: order.user_id,
      phone: profile?.phone ?? "",
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      email: profile?.email ?? null,
    },
    product: {
      slug: order.product_slug,
      name: product?.name ?? order.product_slug,
      brand: product?.brand ?? "",
      tagline: product?.tagline ?? "",
      image: product?.images[0] ?? "",
    },
    installments: (installmentsRes.data ?? []).map((i) => ({
      id: i.id,
      sequence: i.sequence,
      dueDate: i.due_date,
      amountTzs: i.amount_tzs,
      paidAt: i.paid_at,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      kind: p.kind,
      provider: p.provider,
      amountTzs: p.amount_tzs,
      status: p.status,
      evmarkRef: p.evmark_ref,
      createdAt: p.created_at,
      settledAt: p.settled_at,
    })),
    pendingDepositPaymentId: pendingDeposit?.id ?? null,
  };
}

export async function cancelPendingOrder(params: {
  actorId: string;
  orderId: string;
  reason: unknown;
}): Promise<AdminOrderResult<{ status: OrderStatus }>> {
  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) return { ok: false, error: "bad_input", issues: { reason: "length" } };

  const admin = supabaseAdmin();
  const { data: before } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!before) return { ok: false, error: "not_found" };
  if (before.status !== "pending") return { ok: false, error: "wrong_status" };

  const { error } = await admin
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", params.orderId);
  if (error) {
    console.error("[admin-orders] cancel failed", error);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId: params.actorId,
    action: "order.cancel",
    targetTable: "orders",
    targetId: params.orderId,
    diff: {
      status: { from: before.status, to: "cancelled" },
      reason: (reasonCheck as { ok: true; value: string }).value,
    },
  });

  logEvent("admin.order_cancelled", {
    actorId: params.actorId,
    orderId: params.orderId,
  });

  return { ok: true, data: { status: "cancelled" } };
}

export async function activateOrderManually(params: {
  actorId: string;
  orderId: string;
  reason: unknown;
}): Promise<AdminOrderResult<{ paymentId: string }>> {
  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) return { ok: false, error: "bad_input", issues: { reason: "length" } };

  const admin = supabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "not_found" };
  if (order.status !== "pending") return { ok: false, error: "wrong_status" };

  const { data: deposit } = await admin
    .from("payments")
    .select("id, status")
    .eq("order_id", params.orderId)
    .eq("kind", "deposit")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!deposit) return { ok: false, error: "no_pending_deposit" };

  const settle = await settlePaymentSuccess({
    paymentId: deposit.id,
    source: "admin_activate",
    evmarkRef: null,
    rawCallback: {
      source: "admin_activate",
      actorId: params.actorId,
      reason: (reasonCheck as { ok: true; value: string }).value,
    },
  });
  if (!settle.ok) {
    console.error("[admin-orders] activate settle failed", settle.error);
    return { ok: false, error: "settle_failed" };
  }

  await logAdmin({
    actorId: params.actorId,
    action: "order.activate",
    targetTable: "orders",
    targetId: params.orderId,
    diff: {
      paymentId: deposit.id,
      reason: (reasonCheck as { ok: true; value: string }).value,
      alreadySettled: settle.alreadySettled,
    },
  });

  logEvent("admin.order_activated", {
    actorId: params.actorId,
    orderId: params.orderId,
    paymentId: deposit.id,
  });

  return { ok: true, data: { paymentId: deposit.id } };
}

export async function adjustInstallmentSchedule(params: {
  actorId: string;
  orderId: string;
  updates: unknown;
  reason: unknown;
}): Promise<AdminOrderResult<{ updated: number }>> {
  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) return { ok: false, error: "bad_input", issues: { reason: "length" } };

  if (!Array.isArray(params.updates) || params.updates.length === 0) {
    return { ok: false, error: "bad_input", issues: { updates: "empty" } };
  }

  type Update = { id: string; due_date: string };
  const parsed: Update[] = [];
  for (const raw of params.updates) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "bad_input", issues: { updates: "shape" } };
    }
    const id = (raw as { id?: unknown }).id;
    const dueDate = (raw as { dueDate?: unknown }).dueDate;
    if (typeof id !== "string" || !isIsoDate(dueDate)) {
      return { ok: false, error: "bad_input", issues: { updates: "shape" } };
    }
    parsed.push({ id, due_date: dueDate });
  }

  const admin = supabaseAdmin();

  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "not_found" };

  const { data: installments, error: instErr } = await admin
    .from("order_installments")
    .select("id, order_id, due_date, paid_at")
    .in(
      "id",
      parsed.map((u) => u.id),
    );
  if (instErr) {
    console.error("[admin-orders] schedule lookup failed", instErr);
    return { ok: false, error: "unknown" };
  }

  const byId = new Map((installments ?? []).map((i) => [i.id, i]));
  for (const update of parsed) {
    const existing = byId.get(update.id);
    if (!existing || existing.order_id !== params.orderId || existing.paid_at !== null) {
      return { ok: false, error: "bad_input", issues: { updates: "unpaid_only" } };
    }
  }

  const diffs: Array<{ id: string; from: string; to: string }> = [];
  for (const update of parsed) {
    const existing = byId.get(update.id);
    if (!existing) continue;
    if (existing.due_date === update.due_date) continue;
    const { error: updErr } = await admin
      .from("order_installments")
      .update({ due_date: update.due_date })
      .eq("id", update.id);
    if (updErr) {
      console.error("[admin-orders] schedule update failed", updErr);
      return { ok: false, error: "unknown" };
    }
    diffs.push({ id: update.id, from: existing.due_date, to: update.due_date });
  }

  if (diffs.length === 0) return { ok: true, data: { updated: 0 } };

  await logAdmin({
    actorId: params.actorId,
    action: "order.adjust_schedule",
    targetTable: "orders",
    targetId: params.orderId,
    diff: {
      installments: diffs,
      reason: (reasonCheck as { ok: true; value: string }).value,
    },
  });

  logEvent("admin.order_schedule_adjusted", {
    actorId: params.actorId,
    orderId: params.orderId,
    count: diffs.length,
  });

  return { ok: true, data: { updated: diffs.length } };
}

export const REASON_BOUNDS = { min: MIN_REASON, max: MAX_REASON };
