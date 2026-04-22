import { NextResponse, type NextRequest } from "next/server";

import { isValidCallbackHash, parseCallback, type CallbackBody } from "@/lib/evmark";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { settlePaymentSuccess } from "@/lib/payments";

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
    logEvent("payment.settled", {
      paymentId: payment.id,
      kind: payment.kind,
      status: "failed",
      reference: parsed.reference,
      transactionStatus: parsed.transactionStatus,
    });
    return ackSuccess();
  }

  const result = await settlePaymentSuccess({
    paymentId: payment.id,
    source: "callback",
    evmarkRef: parsed.transId ?? null,
    rawCallback: raw as unknown as Record<string, unknown>,
  });

  if (!result.ok) return ackRejected(result.error);
  return ackSuccess();
}
