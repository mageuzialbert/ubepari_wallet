import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { getProduct, getProductsBySlugs } from "@/lib/products";
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

  const activeOrderRows = orders.filter((o) => o.status === "active");
  const productMap = await getProductsBySlugs(
    activeOrderRows.map((o) => o.product_slug),
    locale,
  );
  const activeOrders = activeOrderRows.map((order) => {
    const orderInstallments = installments
      .filter((i) => i.order_id === order.id)
      .sort((a, b) => a.sequence - b.sequence);
    const paid = orderInstallments.filter((i) => i.paid_at !== null);
    const nextDue = orderInstallments.find((i) => i.paid_at === null);
    const paidTzs = paid.reduce((acc, i) => acc + i.amount_tzs, 0);
    const product = productMap.get(order.product_slug);
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

export type OrderDetail = {
  id: string;
  reference: string;
  status: string;
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
    kind: "deposit" | "installment" | "topup" | "refund";
    provider: "mpesa" | "tigopesa" | "airtelmoney" | "card";
    amountTzs: number;
    status: "pending" | "success" | "failed";
    evmarkRef: string | null;
    createdAt: string;
    settledAt: string | null;
  }[];
};

export async function getOrderDetail(
  client: Client,
  userId: string,
  orderId: string,
  locale: Locale,
): Promise<OrderDetail | null> {
  const { data: order, error: orderErr } = await client
    .from("orders")
    .select(
      "id, reference, status, plan_months, cash_price_tzs, deposit_tzs, financed_tzs, service_fee_tzs, total_tzs, monthly_tzs, product_slug, created_at, activated_at, completed_at",
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderErr || !order) return null;

  const [installmentsRes, paymentsRes] = await Promise.all([
    client
      .from("order_installments")
      .select("id, sequence, due_date, amount_tzs, paid_at")
      .eq("order_id", order.id)
      .order("sequence", { ascending: true }),
    client
      .from("payments")
      .select(
        "id, kind, provider, amount_tzs, status, evmark_ref, created_at, settled_at",
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: false }),
  ]);

  const product = await getProduct(order.product_slug, locale);

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
    payments: (paymentsRes.data ?? []).map((p) => ({
      id: p.id,
      kind: p.kind,
      provider: p.provider,
      amountTzs: p.amount_tzs,
      status: p.status,
      evmarkRef: p.evmark_ref,
      createdAt: p.created_at,
      settledAt: p.settled_at,
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

  const productMap = await getProductsBySlugs(
    orderRows.map((o) => o.product_slug),
    locale,
  );

  return {
    orders: orderRows.map((order) => {
      const mine = installmentRows
        .filter((i) => i.order_id === order.id)
        .sort((a, b) => a.sequence - b.sequence);
      const paid = mine.filter((i) => i.paid_at !== null);
      const product = productMap.get(order.product_slug);
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

export type PaymentHistoryFilter =
  | "all"
  | "deposit"
  | "installment"
  | "topup"
  | "refund";

export type PaymentHistoryItem = {
  id: string;
  kind: "deposit" | "installment" | "topup" | "refund";
  provider: "mpesa" | "tigopesa" | "airtelmoney" | "card";
  amountTzs: number;
  status: "pending" | "success" | "failed";
  evmarkRef: string | null;
  createdAt: string;
  settledAt: string | null;
  order: {
    id: string;
    reference: string;
    productName: string;
  } | null;
};

export async function getPaymentsHistory(
  client: Client,
  userId: string,
  locale: Locale,
  filter: PaymentHistoryFilter = "all",
  limit = 100,
): Promise<PaymentHistoryItem[]> {
  let query = client
    .from("payments")
    .select(
      "id, kind, provider, amount_tzs, status, evmark_ref, created_at, settled_at, order_id",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter !== "all") {
    query = query.eq("kind", filter);
  }

  const { data: payments } = await query;
  const rows = payments ?? [];

  const orderIds = Array.from(
    new Set(rows.map((p) => p.order_id).filter((id): id is string => !!id)),
  );

  let ordersById = new Map<
    string,
    { id: string; reference: string; product_slug: string }
  >();
  if (orderIds.length > 0) {
    const { data: orders } = await client
      .from("orders")
      .select("id, reference, product_slug")
      .in("id", orderIds);
    ordersById = new Map((orders ?? []).map((o) => [o.id, o]));
  }

  const slugs = Array.from(ordersById.values()).map((o) => o.product_slug);
  const productMap = await getProductsBySlugs(slugs, locale);

  return rows.map((p) => {
    const order = p.order_id ? ordersById.get(p.order_id) : null;
    const product = order ? productMap.get(order.product_slug) : null;
    return {
      id: p.id,
      kind: p.kind,
      provider: p.provider,
      amountTzs: p.amount_tzs,
      status: p.status,
      evmarkRef: p.evmark_ref,
      createdAt: p.created_at,
      settledAt: p.settled_at,
      order: order
        ? {
            id: order.id,
            reference: order.reference,
            productName: product?.name ?? order.product_slug,
          }
        : null,
    };
  });
}
