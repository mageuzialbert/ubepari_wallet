import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { getProduct } from "@/lib/products";
import type { Locale } from "@/i18n/config";

type Client = SupabaseClient<Database>;

export type WalletSnapshot = {
  profile: {
    firstName: string | null;
    lastName: string | null;
    creditLimitTzs: number;
    creditPoints: number;
    kycStatus: string;
  };
  balance: {
    balanceTzs: number;
    totalOwedTzs: number;
    totalPaidTzs: number;
    nextDueTzs: number;
    nextDueDate: string | null;
  };
  activeOrders: {
    id: string;
    reference: string;
    productSlug: string;
    productName: string;
    productImage: string;
    principalTzs: number;
    paidTzs: number;
    termMonths: number;
    monthsPaid: number;
    monthlyTzs: number;
    nextDueDate: string | null;
  }[];
  recentActivity: {
    id: string;
    kind: "credit" | "debit";
    amountTzs: number;
    noteKey: string;
    noteParams: Record<string, unknown>;
    at: string;
    provider: string | null;
  }[];
};

export async function getWalletSnapshot(
  client: Client,
  userId: string,
  locale: Locale,
): Promise<WalletSnapshot | null> {
  const [profileRes, ordersRes, installmentsRes, entriesRes] = await Promise.all([
    client
      .from("profiles")
      .select(
        "first_name, last_name, credit_limit_tzs, credit_points, kyc_status",
      )
      .eq("id", userId)
      .maybeSingle(),
    client
      .from("orders")
      .select(
        "id, reference, product_slug, plan_months, cash_price_tzs, monthly_tzs, total_tzs, status, created_at",
      )
      .eq("user_id", userId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false }),
    client
      .from("order_installments")
      .select("id, order_id, sequence, due_date, amount_tzs, paid_at"),
    client
      .from("wallet_entries")
      .select("id, kind, amount_tzs, note_key, note_params, created_at, payment_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  if (profileRes.error || !profileRes.data) return null;
  const profile = profileRes.data;

  const orders = ordersRes.data ?? [];
  const installments = installmentsRes.data ?? [];
  const entries = entriesRes.data ?? [];

  const paymentIds = entries
    .map((e) => e.payment_id)
    .filter((id): id is string => id !== null);

  let providerById = new Map<string, string>();
  if (paymentIds.length > 0) {
    const { data: payments } = await client
      .from("payments")
      .select("id, provider")
      .in("id", paymentIds);
    providerById = new Map((payments ?? []).map((p) => [p.id, p.provider]));
  }

  const balanceTzs = entries.reduce(
    (acc, e) => acc + (e.kind === "credit" ? e.amount_tzs : -e.amount_tzs),
    0,
  );

  const activeOrders = orders
    .filter((o) => o.status === "active")
    .map((order) => {
      const orderInstallments = installments
        .filter((i) => i.order_id === order.id)
        .sort((a, b) => a.sequence - b.sequence);
      const paid = orderInstallments.filter((i) => i.paid_at !== null);
      const nextDue = orderInstallments.find((i) => i.paid_at === null);
      const paidTzs = paid.reduce((acc, i) => acc + i.amount_tzs, 0);
      const product = getProduct(order.product_slug, locale);
      return {
        id: order.id,
        reference: order.reference,
        productSlug: order.product_slug,
        productName: product?.name ?? order.product_slug,
        productImage: product?.images[0] ?? "",
        principalTzs: order.cash_price_tzs,
        paidTzs,
        termMonths: order.plan_months,
        monthsPaid: paid.length,
        monthlyTzs: order.monthly_tzs,
        nextDueDate: nextDue?.due_date ?? null,
      };
    });

  const allUnpaid = installments
    .filter((i) => i.paid_at === null)
    .filter((i) => activeOrders.some((o) => o.id === i.order_id))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const nextDue = allUnpaid[0];
  const totalOwedTzs = allUnpaid.reduce((acc, i) => acc + i.amount_tzs, 0);
  const totalPaidTzs = installments
    .filter((i) => i.paid_at !== null)
    .filter((i) => activeOrders.some((o) => o.id === i.order_id))
    .reduce((acc, i) => acc + i.amount_tzs, 0);

  return {
    profile: {
      firstName: profile.first_name,
      lastName: profile.last_name,
      creditLimitTzs: profile.credit_limit_tzs,
      creditPoints: profile.credit_points,
      kycStatus: profile.kyc_status,
    },
    balance: {
      balanceTzs,
      totalOwedTzs,
      totalPaidTzs,
      nextDueTzs: nextDue?.amount_tzs ?? 0,
      nextDueDate: nextDue?.due_date ?? null,
    },
    activeOrders,
    recentActivity: entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      amountTzs: e.amount_tzs,
      noteKey: e.note_key,
      noteParams: (e.note_params as Record<string, unknown>) ?? {},
      at: e.created_at,
      provider: e.payment_id ? providerById.get(e.payment_id) ?? null : null,
    })),
  };
}

export type OrdersSnapshot = {
  orders: {
    id: string;
    reference: string;
    productSlug: string;
    productName: string;
    productImage: string;
    principalTzs: number;
    paidTzs: number;
    termMonths: number;
    monthsPaid: number;
    monthlyTzs: number;
    status: string;
    createdAt: string;
    installments: {
      id: string;
      sequence: number;
      dueDate: string;
      amountTzs: number;
      paidAt: string | null;
    }[];
  }[];
};

export async function getOrdersSnapshot(
  client: Client,
  userId: string,
  locale: Locale,
): Promise<OrdersSnapshot> {
  const { data: orders } = await client
    .from("orders")
    .select(
      "id, reference, product_slug, plan_months, cash_price_tzs, monthly_tzs, total_tzs, status, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const orderRows = orders ?? [];
  if (orderRows.length === 0) return { orders: [] };

  const { data: installments } = await client
    .from("order_installments")
    .select("id, order_id, sequence, due_date, amount_tzs, paid_at")
    .in(
      "order_id",
      orderRows.map((o) => o.id),
    );
  const installmentRows = installments ?? [];

  return {
    orders: orderRows.map((order) => {
      const mine = installmentRows
        .filter((i) => i.order_id === order.id)
        .sort((a, b) => a.sequence - b.sequence);
      const paid = mine.filter((i) => i.paid_at !== null);
      const product = getProduct(order.product_slug, locale);
      return {
        id: order.id,
        reference: order.reference,
        productSlug: order.product_slug,
        productName: product?.name ?? order.product_slug,
        productImage: product?.images[0] ?? "",
        principalTzs: order.cash_price_tzs,
        paidTzs: paid.reduce((acc, i) => acc + i.amount_tzs, 0),
        termMonths: order.plan_months,
        monthsPaid: paid.length,
        monthlyTzs: order.monthly_tzs,
        status: order.status,
        createdAt: order.created_at,
        installments: mine.map((i) => ({
          id: i.id,
          sequence: i.sequence,
          dueDate: i.due_date,
          amountTzs: i.amount_tzs,
          paidAt: i.paid_at,
        })),
      };
    }),
  };
}
