import { NextResponse } from "next/server";

import { requireSupabaseForUser } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await requireSupabaseForUser();
    const { id } = await params;

    const { data: order, error: orderErr } = await client
      .from("orders")
      .select(
        "id, product_slug, plan_months, deposit_tzs, monthly_tzs, total_tzs, status, reference, created_at, activated_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (orderErr) {
      return NextResponse.json({ error: "unknown", detail: orderErr.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: deposit } = await client
      .from("payments")
      .select("status, provider, settled_at")
      .eq("order_id", order.id)
      .eq("kind", "deposit")
      .maybeSingle();

    return NextResponse.json({
      order,
      deposit: deposit ?? null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "unauthenticated") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    throw err;
  }
}
