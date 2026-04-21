import { NextResponse, type NextRequest } from "next/server";

import { isValidCallbackHash, parseCallback, type CallbackBody } from "@/lib/evmark";
import { supabaseAdmin } from "@/lib/supabase/admin";

function ackSuccess() {
  return NextResponse.json({ Status: "Success" });
}

function ackRejected(reason: string) {
  console.error("[mno-callback] rejected", reason);
  return NextResponse.json({ Status: "Rejected", reason }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const user = process.env.EVMARK_USER;
  if (!user) return ackRejected("evmark-not-configured");

  const raw = (await req.json().catch(() => null)) as CallbackBody | null;
  if (!raw) return ackRejected("bad_json");

  const parsed = parseCallback(raw);
  if (!parsed) return ackRejected("no_reference");

  if (parsed.hash && !isValidCallbackHash(parsed.hash, user)) {
    return ackRejected("bad_hash");
  }

  const admin = supabaseAdmin();

  const { data: payment, error } = await admin
    .from("payments")
    .select("id, user_id, order_id, kind, amount_tzs, status")
    .eq("evmark_reference_id", parsed.reference)
    .maybeSingle();
  if (error) return ackRejected(`lookup_error: ${error.message}`);
  if (!payment) return ackRejected(`no_payment_for_ref: ${parsed.reference}`);

  // Idempotency: already-settled callbacks just get acked.
  if (payment.status === "success" || payment.status === "failed") {
    return ackSuccess();
  }

  if (!parsed.success) {
    await admin
      .from("payments")
      .update({
        status: "failed",
        evmark_ref: parsed.transId ?? undefined,
        raw_callback: raw as unknown as Record<string, unknown>,
        settled_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (payment.kind === "deposit" && payment.order_id) {
      await admin.from("orders").update({ status: "cancelled" }).eq("id", payment.order_id);
    }
    return ackSuccess();
  }

  // Success path.
  const settledAt = new Date().toISOString();
  const { error: payUpdErr } = await admin
    .from("payments")
    .update({
      status: "success",
      evmark_ref: parsed.transId ?? undefined,
      raw_callback: raw as unknown as Record<string, unknown>,
      settled_at: settledAt,
    })
    .eq("id", payment.id);
  if (payUpdErr) return ackRejected(`payment_update_error: ${payUpdErr.message}`);

  if (payment.kind === "deposit" && payment.order_id) {
    await admin
      .from("orders")
      .update({ status: "active", activated_at: settledAt })
      .eq("id", payment.order_id);

    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "credit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      note_key: "deposit",
      note_params: { orderId: payment.order_id },
    });
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "debit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      note_key: "deposit",
      note_params: { orderId: payment.order_id },
    });
  } else if (payment.kind === "topup") {
    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "credit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      note_key: "topup",
      note_params: {},
    });
  } else if (payment.kind === "installment" && payment.order_id) {
    await admin
      .from("order_installments")
      .update({ paid_at: settledAt, payment_id: payment.id })
      .eq("order_id", payment.order_id)
      .is("paid_at", null)
      .order("sequence", { ascending: true })
      .limit(1);

    await admin.from("wallet_entries").insert({
      user_id: payment.user_id,
      kind: "debit",
      amount_tzs: payment.amount_tzs,
      payment_id: payment.id,
      note_key: "payment",
      note_params: { orderId: payment.order_id },
    });
  }

  return ackSuccess();
}
