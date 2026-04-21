import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeTzPhone } from "@/lib/phone";
import { generateReference, pushMno, type EvmarkProvider } from "@/lib/evmark";

const ALLOWED: EvmarkProvider[] = ["mpesa", "tigopesa", "airtelmoney"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const userId = session.claims.userId;

  const body = (await req.json().catch(() => null)) as {
    installmentId?: unknown;
    provider?: unknown;
    phone?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const installmentId = typeof body.installmentId === "string" ? body.installmentId : "";
  const provider =
    typeof body.provider === "string" && (ALLOWED as string[]).includes(body.provider)
      ? (body.provider as EvmarkProvider)
      : null;
  const providedPhone =
    typeof body.phone === "string" && body.phone.trim().length > 0
      ? body.phone
      : session.claims.phone;

  if (!installmentId || !provider) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const normalized = normalizeTzPhone(providedPhone);
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;

  const admin = supabaseAdmin();

  const { data: installment, error: instErr } = await admin
    .from("order_installments")
    .select("id, order_id, amount_tzs, paid_at")
    .eq("id", installmentId)
    .maybeSingle();
  if (instErr) {
    console.error("[pay-installment] lookup failed", instErr);
    return NextResponse.json({ error: "unknown", detail: instErr.message }, { status: 500 });
  }
  if (!installment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (installment.paid_at) {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", installment.order_id)
    .maybeSingle();
  if (orderErr || !order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (order.status !== "active") {
    return NextResponse.json({ error: "order_not_active" }, { status: 409 });
  }

  const reference = generateReference(phone);

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      user_id: userId,
      order_id: installment.order_id,
      kind: "installment",
      amount_tzs: installment.amount_tzs,
      provider,
      evmark_reference_id: reference,
    })
    .select("id")
    .single();
  if (payErr || !payment) {
    console.error("[pay-installment] payment insert failed", payErr);
    return NextResponse.json(
      { error: "unknown", detail: payErr?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  const push = await pushMno({
    amount: installment.amount_tzs,
    productLabel: "Ubepari installment",
    mobileNo: phone,
    reference,
    provider,
  });

  if (!push.ok) {
    console.error("[pay-installment] evmark push failed", push.reason);
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return NextResponse.json(
      { error: "push_failed", detail: push.reason },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    reference,
    provider,
    amount: installment.amount_tzs,
  });
}
