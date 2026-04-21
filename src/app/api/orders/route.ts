import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeCreditPlan, CREDIT_TERMS, type CreditTerm } from "@/lib/credit";
import { getProduct } from "@/lib/products";
import { defaultLocale } from "@/i18n/config";
import { normalizeTzPhone } from "@/lib/phone";
import { generateReference, pushMno, type EvmarkProvider } from "@/lib/evmark";
import { logEvent } from "@/lib/events";
import { hasPendingPush } from "@/lib/payments";

const ALLOWED_PROVIDERS: EvmarkProvider[] = ["mpesa", "tigopesa", "airtelmoney"];

function asProvider(v: unknown): EvmarkProvider | null {
  return typeof v === "string" && (ALLOWED_PROVIDERS as string[]).includes(v)
    ? (v as EvmarkProvider)
    : null;
}

function asTerm(v: unknown): CreditTerm | null {
  return typeof v === "number" && (CREDIT_TERMS as number[]).includes(v)
    ? (v as CreditTerm)
    : null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const userId = session.claims.userId;
  const sessionPhone = session.claims.phone;

  const body = (await req.json().catch(() => null)) as
    | { productSlug?: unknown; planMonths?: unknown; provider?: unknown; phone?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const productSlug = typeof body.productSlug === "string" ? body.productSlug : "";
  const planMonths = asTerm(body.planMonths);
  const provider = asProvider(body.provider);
  const providedPhone = typeof body.phone === "string" ? body.phone : sessionPhone;

  if (!productSlug || !planMonths || !provider) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const phone = normalizeTzPhone(providedPhone);
  if (!phone.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const product = getProduct(productSlug, defaultLocale);
  if (!product) {
    return NextResponse.json({ error: "product_not_found" }, { status: 404 });
  }

  const admin = supabaseAdmin();

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("kyc_status, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr || !profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 500 });
  }
  if (profile.kyc_status !== "approved") {
    return NextResponse.json({ error: "kyc_not_approved" }, { status: 403 });
  }

  if (await hasPendingPush(userId)) {
    return NextResponse.json({ error: "pending_push" }, { status: 429 });
  }

  const plan = computeCreditPlan(product.priceTzs, planMonths);
  const reference = generateReference(phone.value);

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      product_slug: productSlug,
      plan_months: planMonths,
      cash_price_tzs: plan.price,
      deposit_tzs: plan.deposit,
      financed_tzs: plan.financed,
      service_fee_tzs: plan.totalPayable - plan.price,
      total_tzs: plan.totalPayable,
      monthly_tzs: plan.monthly,
      reference,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    console.error("[orders] insert failed", orderErr);
    return NextResponse.json(
      { error: "unknown", detail: orderErr?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  const now = new Date();
  const installments = Array.from({ length: planMonths }, (_, i) => {
    const due = new Date(now);
    due.setUTCMonth(due.getUTCMonth() + i + 1);
    return {
      order_id: order.id,
      sequence: i + 1,
      due_date: due.toISOString().slice(0, 10),
      amount_tzs: plan.monthly,
    };
  });
  const { error: instErr } = await admin.from("order_installments").insert(installments);
  if (instErr) {
    console.error("[orders] installments insert failed", instErr);
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "unknown", detail: instErr.message }, { status: 500 });
  }

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      user_id: userId,
      order_id: order.id,
      kind: "deposit",
      amount_tzs: plan.deposit,
      provider,
      evmark_reference_id: reference,
    })
    .select("id")
    .single();
  if (payErr || !payment) {
    console.error("[orders] payment insert failed", payErr);
    await admin.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { error: "unknown", detail: payErr?.message ?? "payment insert failed" },
      { status: 500 },
    );
  }

  const push = await pushMno({
    amount: plan.deposit,
    productLabel: `Ubepari ${product.name}`,
    mobileNo: phone.value,
    reference,
    provider,
  });

  if (!push.ok) {
    logEvent("payment.push_failed", {
      kind: "deposit",
      userId,
      reference,
      reason: push.reason,
    });
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return NextResponse.json(
      { error: "push_failed", detail: push.reason },
      { status: 502 },
    );
  }

  logEvent("order.created", {
    userId,
    orderId: order.id,
    reference,
    productSlug,
    planMonths,
    deposit: plan.deposit,
    total: plan.totalPayable,
    provider,
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    reference,
    provider,
    phone: phone.value,
    amount: plan.deposit,
  });
}
