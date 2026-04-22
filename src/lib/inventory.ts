import "server-only";

import { logEvent } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function decrementStockForOrder(orderId: string): Promise<void> {
  const admin = supabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("product_slug")
    .eq("id", orderId)
    .maybeSingle();
  if (!order?.product_slug) {
    logEvent("stock.decrement_skipped", { orderId, reason: "no_order_or_slug" });
    return;
  }

  const { data: product } = await admin
    .from("products")
    .select("id, stock")
    .eq("slug", order.product_slug)
    .maybeSingle();
  if (!product) {
    logEvent("stock.decrement_skipped", {
      orderId,
      slug: order.product_slug,
      reason: "product_not_found",
    });
    return;
  }

  const nextStock = Math.max(0, product.stock - 1);
  const { error } = await admin
    .from("products")
    .update({ stock: nextStock, updated_at: new Date().toISOString() })
    .eq("id", product.id);

  if (error) {
    console.error("[inventory] decrement failed", error);
    logEvent("stock.decrement_failed", {
      orderId,
      slug: order.product_slug,
      error: error.message,
    });
    return;
  }

  logEvent("stock.decremented", {
    orderId,
    slug: order.product_slug,
    from: product.stock,
    to: nextStock,
  });
}
