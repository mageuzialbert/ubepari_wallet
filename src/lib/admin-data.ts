import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PaymentKind } from "@/lib/supabase/types";

export type DashboardKpis = {
  orders: {
    today: number;
    week: number;
    month: number;
    active: number;
  };
  overdueInstallments: number;
  pendingKyc: number;
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  lowStock: { slug: string; nameEn: string; stock: number }[];
};

const REVENUE_KINDS: PaymentKind[] = ["deposit", "installment", "topup"];
const LOW_STOCK_THRESHOLD = 3;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function countOrdersSince(since: Date): Promise<number> {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

async function sumRevenueSince(since: Date): Promise<number> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("payments")
    .select("amount_tzs")
    .in("kind", REVENUE_KINDS)
    .eq("status", "success")
    .gte("created_at", since.toISOString());
  return (data ?? []).reduce((acc, p) => acc + p.amount_tzs, 0);
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const admin = supabaseAdmin();

  const today = startOfDay(new Date());
  const weekAgo = daysAgo(7);
  const monthAgo = daysAgo(30);
  const todayIso = today.toISOString().slice(0, 10);

  const [
    ordersToday,
    ordersWeek,
    ordersMonth,
    activeOrdersRes,
    overdueRes,
    pendingKycRes,
    revenueToday,
    revenueWeek,
    revenueMonth,
    lowStockRes,
  ] = await Promise.all([
    countOrdersSince(today),
    countOrdersSince(weekAgo),
    countOrdersSince(monthAgo),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("order_installments")
      .select("*", { count: "exact", head: true })
      .is("paid_at", null)
      .lt("due_date", todayIso),
    admin
      .from("kyc_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    sumRevenueSince(today),
    sumRevenueSince(weekAgo),
    sumRevenueSince(monthAgo),
    admin
      .from("products")
      .select("slug, name_en, stock")
      .eq("active", true)
      .lt("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .limit(10),
  ]);

  return {
    orders: {
      today: ordersToday,
      week: ordersWeek,
      month: ordersMonth,
      active: activeOrdersRes.count ?? 0,
    },
    overdueInstallments: overdueRes.count ?? 0,
    pendingKyc: pendingKycRes.count ?? 0,
    revenue: {
      today: revenueToday,
      week: revenueWeek,
      month: revenueMonth,
    },
    lowStock: (lowStockRes.data ?? []).map((p) => ({
      slug: p.slug,
      nameEn: p.name_en,
      stock: p.stock,
    })),
  };
}
