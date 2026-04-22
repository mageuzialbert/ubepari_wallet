import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Locale } from "@/i18n/config";
import type {
  PaymentKind,
  PaymentProvider,
} from "@/lib/supabase/types";
import type { Range } from "@/lib/reports-range";

const REVENUE_KINDS: PaymentKind[] = ["deposit", "installment", "topup"];
const PROVIDERS: PaymentProvider[] = ["mpesa", "tigopesa", "airtelmoney", "card"];
const LOW_STOCK_THRESHOLD = 3;

// ============================================================
// Revenue
// ============================================================

export type RevenueDailyBucket = {
  dateKey: string; // YYYY-MM-DD (UTC)
  deposit: number;
  installment: number;
  topup: number;
  total: number;
};

export type RevenueReport = {
  range: { since: string; until: string };
  totals: {
    deposit: number;
    installment: number;
    topup: number;
    total: number;
    count: number;
  };
  byProvider: Record<PaymentProvider, number>;
  daily: RevenueDailyBucket[];
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function enumerateDays(since: Date, until: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(since);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setHours(0, 0, 0, 0);
  while (cursor < end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export async function getRevenueReport(range: Range): Promise<RevenueReport> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("payments")
    .select("amount_tzs, kind, provider, created_at")
    .eq("status", "success")
    .in("kind", REVENUE_KINDS)
    .gte("created_at", range.since.toISOString())
    .lt("created_at", range.until.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  const days = enumerateDays(range.since, range.until);
  const daily = new Map<string, RevenueDailyBucket>(
    days.map((d) => [
      d,
      { dateKey: d, deposit: 0, installment: 0, topup: 0, total: 0 },
    ]),
  );

  const byProvider: Record<PaymentProvider, number> = {
    mpesa: 0,
    tigopesa: 0,
    airtelmoney: 0,
    card: 0,
  };
  const totals = { deposit: 0, installment: 0, topup: 0, total: 0, count: 0 };

  for (const row of data ?? []) {
    const key = dayKey(row.created_at);
    const bucket = daily.get(key);
    if (bucket) {
      if (row.kind === "deposit") bucket.deposit += row.amount_tzs;
      else if (row.kind === "installment") bucket.installment += row.amount_tzs;
      else if (row.kind === "topup") bucket.topup += row.amount_tzs;
      bucket.total += row.amount_tzs;
    }
    if (row.kind === "deposit") totals.deposit += row.amount_tzs;
    else if (row.kind === "installment") totals.installment += row.amount_tzs;
    else if (row.kind === "topup") totals.topup += row.amount_tzs;
    totals.total += row.amount_tzs;
    totals.count += 1;
    if (PROVIDERS.includes(row.provider)) byProvider[row.provider] += row.amount_tzs;
  }

  return {
    range: {
      since: range.since.toISOString(),
      until: range.until.toISOString(),
    },
    totals,
    byProvider,
    daily: days.map((d) => daily.get(d)!),
  };
}

// ============================================================
// Receivables (snapshot, ignores range)
// ============================================================

export type ReceivablesBucket =
  | "current"
  | "d0_30"
  | "d31_60"
  | "d61_90"
  | "d90_plus";

export type ReceivablesRow = {
  orderId: string;
  reference: string;
  userId: string;
  userName: string;
  userPhone: string;
  balance: number;
  unpaidCount: number;
  overdueCount: number;
  nextDueDate: string | null;
  oldestOverdueDueDate: string | null;
  oldestOverdueDays: number;
  bucket: ReceivablesBucket;
};

export type ReceivablesReport = {
  totalOutstanding: number;
  orderCount: number;
  overdueOrderCount: number;
  bucketTotals: Record<ReceivablesBucket, number>;
  bucketCounts: Record<ReceivablesBucket, number>;
  rows: ReceivablesRow[];
};

function toReceivablesBucket(days: number): ReceivablesBucket {
  if (days <= 0) return "current";
  if (days <= 30) return "d0_30";
  if (days <= 60) return "d31_60";
  if (days <= 90) return "d61_90";
  return "d90_plus";
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T00:00:00Z`);
  const b = new Date(`${toYmd}T00:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getReceivablesReport(): Promise<ReceivablesReport> {
  const admin = supabaseAdmin();

  const { data: orders, error: ordersErr } = await admin
    .from("orders")
    .select("id, reference, user_id, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (ordersErr) throw ordersErr;

  const activeOrders = orders ?? [];
  if (activeOrders.length === 0) {
    return emptyReceivables();
  }

  const orderIds = activeOrders.map((o) => o.id);
  const userIds = Array.from(new Set(activeOrders.map((o) => o.user_id)));

  const [instalRes, profilesRes] = await Promise.all([
    admin
      .from("order_installments")
      .select("order_id, due_date, amount_tzs")
      .in("order_id", orderIds)
      .is("paid_at", null),
    admin
      .from("profiles")
      .select("id, phone, first_name, last_name")
      .in("id", userIds),
  ]);
  if (instalRes.error) throw instalRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p]),
  );

  type InstalAgg = {
    balance: number;
    unpaidCount: number;
    overdueCount: number;
    nextDue: string | null;
    oldestOverdueDue: string | null;
  };
  const today = todayYmd();
  const perOrder = new Map<string, InstalAgg>();

  for (const inst of instalRes.data ?? []) {
    const agg = perOrder.get(inst.order_id) ?? {
      balance: 0,
      unpaidCount: 0,
      overdueCount: 0,
      nextDue: null as string | null,
      oldestOverdueDue: null as string | null,
    };
    agg.balance += inst.amount_tzs;
    agg.unpaidCount += 1;
    if (!agg.nextDue || inst.due_date < agg.nextDue) agg.nextDue = inst.due_date;
    if (inst.due_date < today) {
      agg.overdueCount += 1;
      if (!agg.oldestOverdueDue || inst.due_date < agg.oldestOverdueDue) {
        agg.oldestOverdueDue = inst.due_date;
      }
    }
    perOrder.set(inst.order_id, agg);
  }

  const bucketTotals: Record<ReceivablesBucket, number> = {
    current: 0,
    d0_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90_plus: 0,
  };
  const bucketCounts: Record<ReceivablesBucket, number> = {
    current: 0,
    d0_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90_plus: 0,
  };

  const rows: ReceivablesRow[] = [];
  let overdueOrderCount = 0;
  let totalOutstanding = 0;

  for (const order of activeOrders) {
    const agg = perOrder.get(order.id);
    if (!agg || agg.balance <= 0) continue;

    const overdueDays = agg.oldestOverdueDue
      ? daysBetween(agg.oldestOverdueDue, today)
      : 0;
    const bucket = toReceivablesBucket(overdueDays);
    const profile = profileById.get(order.user_id);
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    rows.push({
      orderId: order.id,
      reference: order.reference,
      userId: order.user_id,
      userName: name || profile?.phone || "—",
      userPhone: profile?.phone ?? "",
      balance: agg.balance,
      unpaidCount: agg.unpaidCount,
      overdueCount: agg.overdueCount,
      nextDueDate: agg.nextDue,
      oldestOverdueDueDate: agg.oldestOverdueDue,
      oldestOverdueDays: overdueDays,
      bucket,
    });

    bucketTotals[bucket] += agg.balance;
    bucketCounts[bucket] += 1;
    totalOutstanding += agg.balance;
    if (agg.overdueCount > 0) overdueOrderCount += 1;
  }

  rows.sort((a, b) => {
    if (b.oldestOverdueDays !== a.oldestOverdueDays) {
      return b.oldestOverdueDays - a.oldestOverdueDays;
    }
    return b.balance - a.balance;
  });

  return {
    totalOutstanding,
    orderCount: rows.length,
    overdueOrderCount,
    bucketTotals,
    bucketCounts,
    rows,
  };
}

function emptyReceivables(): ReceivablesReport {
  return {
    totalOutstanding: 0,
    orderCount: 0,
    overdueOrderCount: 0,
    bucketTotals: { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 },
    bucketCounts: { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 },
    rows: [],
  };
}

// ============================================================
// Inventory (snapshot, ignores range)
// ============================================================

export type InventoryRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  cashPriceTzs: number;
  stock: number;
  featured: boolean;
  lowStock: boolean;
  outOfStock: boolean;
};

export type InventoryReport = {
  rows: InventoryRow[];
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
  productCount: number;
};

export async function getInventoryReport(locale: Locale): Promise<InventoryReport> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("products")
    .select("id, slug, brand, name_en, name_sw, cash_price_tzs, stock, featured")
    .eq("active", true)
    .order("stock", { ascending: true });
  if (error) throw error;

  const rows: InventoryRow[] = (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: locale === "sw" ? p.name_sw : p.name_en,
    brand: p.brand,
    cashPriceTzs: p.cash_price_tzs,
    stock: p.stock,
    featured: p.featured,
    lowStock: p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD,
    outOfStock: p.stock === 0,
  }));

  const totalStockUnits = rows.reduce((acc, r) => acc + r.stock, 0);
  const lowStockCount = rows.filter((r) => r.lowStock).length;
  const outOfStockCount = rows.filter((r) => r.outOfStock).length;
  const inventoryValue = rows.reduce(
    (acc, r) => acc + r.stock * r.cashPriceTzs,
    0,
  );

  return {
    rows,
    totalStockUnits,
    lowStockCount,
    outOfStockCount,
    inventoryValue,
    productCount: rows.length,
  };
}

// ============================================================
// KYC throughput
// ============================================================

export type KycWeekBucket = {
  weekStart: string; // YYYY-MM-DD of Monday
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
};

export type KycReport = {
  range: { since: string; until: string };
  totals: {
    submitted: number;
    approved: number;
    rejected: number;
    pending: number;
    reviewed: number;
    pendingAll: number; // includes rows outside range still awaiting review
  };
  approvalRate: number | null; // approved / (approved + rejected), null if 0
  medianHoursToReview: number | null;
  weeks: KycWeekBucket[];
};

function weekStartMonday(iso: string): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function enumerateWeeks(since: Date, until: Date): string[] {
  const out: string[] = [];
  const cursor = new Date(since);
  cursor.setUTCHours(0, 0, 0, 0);
  const dow = cursor.getUTCDay();
  const offset = (dow + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - offset);
  while (cursor < until) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function getKycReport(range: Range): Promise<KycReport> {
  const admin = supabaseAdmin();

  const [rangeRes, pendingAllRes] = await Promise.all([
    admin
      .from("kyc_submissions")
      .select("status, submitted_at, reviewed_at")
      .gte("submitted_at", range.since.toISOString())
      .lt("submitted_at", range.until.toISOString())
      .order("submitted_at", { ascending: true }),
    admin
      .from("kyc_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  if (rangeRes.error) throw rangeRes.error;
  if (pendingAllRes.error) throw pendingAllRes.error;

  const weekKeys = enumerateWeeks(range.since, range.until);
  const weeks = new Map<string, KycWeekBucket>(
    weekKeys.map((w) => [
      w,
      { weekStart: w, submitted: 0, approved: 0, rejected: 0, pending: 0 },
    ]),
  );

  const totals = {
    submitted: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    reviewed: 0,
    pendingAll: pendingAllRes.count ?? 0,
  };
  const reviewHours: number[] = [];

  for (const row of rangeRes.data ?? []) {
    const w = weekStartMonday(row.submitted_at);
    const bucket = weeks.get(w);
    if (bucket) bucket.submitted += 1;
    totals.submitted += 1;

    if (row.status === "approved") {
      if (bucket) bucket.approved += 1;
      totals.approved += 1;
    } else if (row.status === "rejected") {
      if (bucket) bucket.rejected += 1;
      totals.rejected += 1;
    } else if (row.status === "pending") {
      if (bucket) bucket.pending += 1;
      totals.pending += 1;
    }

    if (row.reviewed_at && (row.status === "approved" || row.status === "rejected")) {
      totals.reviewed += 1;
      const ms =
        new Date(row.reviewed_at).getTime() -
        new Date(row.submitted_at).getTime();
      if (ms >= 0) reviewHours.push(ms / (1000 * 60 * 60));
    }
  }

  const decided = totals.approved + totals.rejected;
  const approvalRate = decided > 0 ? totals.approved / decided : null;

  return {
    range: {
      since: range.since.toISOString(),
      until: range.until.toISOString(),
    },
    totals,
    approvalRate,
    medianHoursToReview: median(reviewHours),
    weeks: weekKeys.map((w) => weeks.get(w)!),
  };
}
