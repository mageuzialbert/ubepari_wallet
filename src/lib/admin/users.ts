import "server-only";

import type { Locale } from "@/i18n/config";
import { logAdmin } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { isRootAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getOrdersSnapshot,
  getPaymentsHistory,
  getWalletSnapshot,
  type OrdersSnapshot,
  type PaymentHistoryItem,
  type WalletSnapshot,
} from "@/lib/wallet-data";
import type { KycStatus } from "@/lib/supabase/types";
import { listKycForUser, type AdminKycListRow } from "@/lib/admin/kyc-data";

const LIST_LIMIT = 100;
const MIN_CREDIT_LIMIT = 0;
const MAX_CREDIT_LIMIT = 100_000_000;
const MIN_REASON = 1;
const MAX_REASON = 500;

export type AdminUserRow = {
  id: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  kyc_status: KycStatus;
  credit_limit_tzs: number;
  credit_points: number;
  is_admin: boolean;
  created_at: string;
  orders_count: number;
};

export type AdminUserDetail = {
  id: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  kyc_status: KycStatus;
  credit_limit_tzs: number;
  credit_points: number;
  is_admin: boolean;
  is_root: boolean;
  created_at: string;
  wallet: WalletSnapshot | null;
  orders: OrdersSnapshot;
  payments: PaymentHistoryItem[];
  kyc_history: AdminKycListRow[];
};

export type AdminUserError =
  | "not_found"
  | "bad_input"
  | "forbidden"
  | "self_edit_forbidden"
  | "root_demotion_forbidden"
  | "unknown";

export type AdminUserResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AdminUserError; issues?: Record<string, string> };

export async function listAdminUsers(filters: { search?: string } = {}): Promise<AdminUserRow[]> {
  const admin = supabaseAdmin();
  let query = admin
    .from("profiles")
    .select(
      "id, phone, first_name, last_name, email, kyc_status, credit_limit_tzs, credit_points, is_admin, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  const q = filters.search?.trim();
  if (q && q.length > 0) {
    const pattern = `%${q.replace(/[%,]/g, "")}%`;
    query = query.or(
      [
        `phone.ilike.${pattern}`,
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin-users] list failed", error);
    return [];
  }
  const rows = (data ?? []) as Array<Omit<AdminUserRow, "orders_count">>;
  if (rows.length === 0) return [];

  const { data: orders } = await admin
    .from("orders")
    .select("user_id")
    .in(
      "user_id",
      rows.map((r) => r.id),
    );
  const counts = new Map<string, number>();
  for (const row of orders ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  return rows.map((row) => ({ ...row, orders_count: counts.get(row.id) ?? 0 }));
}

export async function getAdminUser(
  userId: string,
  locale: Locale,
): Promise<AdminUserDetail | null> {
  const admin = supabaseAdmin();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id, phone, first_name, last_name, email, kyc_status, credit_limit_tzs, credit_points, is_admin, created_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin-users] detail failed", error);
    return null;
  }
  if (!profile) return null;

  const [wallet, orders, payments, kyc_history] = await Promise.all([
    getWalletSnapshot(admin, userId, locale),
    getOrdersSnapshot(admin, userId, locale),
    getPaymentsHistory(admin, userId, locale, "all", 20),
    listKycForUser(userId),
  ]);

  return {
    ...profile,
    is_root: isRootAdmin(profile.phone),
    wallet,
    orders,
    payments,
    kyc_history,
  };
}

function validateReason(raw: unknown): { ok: true; value: string } | { ok: false } {
  if (typeof raw !== "string") return { ok: false };
  const trimmed = raw.trim();
  if (trimmed.length < MIN_REASON || trimmed.length > MAX_REASON) return { ok: false };
  return { ok: true, value: trimmed };
}

export async function changeCreditLimit(params: {
  actorId: string;
  userId: string;
  amount: unknown;
  reason: unknown;
}): Promise<AdminUserResult<{ creditLimitTzs: number }>> {
  const issues: Record<string, string> = {};

  const amount = typeof params.amount === "number" ? params.amount : Number(params.amount);
  if (!Number.isInteger(amount) || amount < MIN_CREDIT_LIMIT || amount > MAX_CREDIT_LIMIT) {
    issues.amount = "range";
  }

  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) issues.reason = "length";

  if (Object.keys(issues).length > 0) {
    return { ok: false, error: "bad_input", issues };
  }

  const admin = supabaseAdmin();
  const { data: before } = await admin
    .from("profiles")
    .select("id, credit_limit_tzs")
    .eq("id", params.userId)
    .maybeSingle();
  if (!before) return { ok: false, error: "not_found" };

  if (before.credit_limit_tzs === amount) {
    return { ok: true, data: { creditLimitTzs: amount } };
  }

  const { error: updErr } = await admin
    .from("profiles")
    .update({ credit_limit_tzs: amount })
    .eq("id", params.userId);
  if (updErr) {
    console.error("[admin-users] credit limit update failed", updErr);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId: params.actorId,
    action: "user.credit_limit.change",
    targetTable: "profiles",
    targetId: params.userId,
    diff: {
      credit_limit_tzs: { from: before.credit_limit_tzs, to: amount },
      reason: (reasonCheck as { ok: true; value: string }).value,
    },
  });

  logEvent("admin.credit_limit_changed", {
    actorId: params.actorId,
    userId: params.userId,
    from: before.credit_limit_tzs,
    to: amount,
  });

  return { ok: true, data: { creditLimitTzs: amount } };
}

export async function setAdminRole(params: {
  actorId: string;
  actorIsRoot: boolean;
  userId: string;
  grant: boolean;
  reason: unknown;
}): Promise<AdminUserResult<{ isAdmin: boolean }>> {
  if (!params.actorIsRoot) return { ok: false, error: "forbidden" };
  if (params.actorId === params.userId) {
    return { ok: false, error: "self_edit_forbidden" };
  }

  const reasonCheck = validateReason(params.reason);
  if (!reasonCheck.ok) {
    return { ok: false, error: "bad_input", issues: { reason: "length" } };
  }

  const admin = supabaseAdmin();
  const { data: before } = await admin
    .from("profiles")
    .select("id, phone, is_admin")
    .eq("id", params.userId)
    .maybeSingle();
  if (!before) return { ok: false, error: "not_found" };

  if (isRootAdmin(before.phone)) {
    return { ok: false, error: "root_demotion_forbidden" };
  }

  if (before.is_admin === params.grant) {
    return { ok: true, data: { isAdmin: params.grant } };
  }

  const { error: updErr } = await admin
    .from("profiles")
    .update({ is_admin: params.grant })
    .eq("id", params.userId);
  if (updErr) {
    console.error("[admin-users] admin role update failed", updErr);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId: params.actorId,
    action: params.grant ? "user.admin.grant" : "user.admin.revoke",
    targetTable: "profiles",
    targetId: params.userId,
    diff: {
      is_admin: { from: before.is_admin, to: params.grant },
      reason: (reasonCheck as { ok: true; value: string }).value,
    },
  });

  logEvent(params.grant ? "admin.role_granted" : "admin.role_revoked", {
    actorId: params.actorId,
    userId: params.userId,
  });

  return { ok: true, data: { isAdmin: params.grant } };
}

export const CREDIT_LIMIT_BOUNDS = { min: MIN_CREDIT_LIMIT, max: MAX_CREDIT_LIMIT };
export const REASON_BOUNDS = { min: MIN_REASON, max: MAX_REASON };
