import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeTzPhone } from "@/lib/phone";
import { generateReference, pushMno, type EvmarkProvider } from "@/lib/evmark";

const ALLOWED: EvmarkProvider[] = ["mpesa", "tigopesa", "airtelmoney"];
const MIN_TOPUP_TZS = 1000;
const MAX_TOPUP_TZS = 5_000_000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    amountTzs?: unknown;
    provider?: unknown;
    phone?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const amount =
    typeof body.amountTzs === "number" && Number.isFinite(body.amountTzs)
      ? Math.floor(body.amountTzs)
      : null;
  const provider =
    typeof body.provider === "string" && (ALLOWED as string[]).includes(body.provider)
      ? (body.provider as EvmarkProvider)
      : null;
  const providedPhone =
    typeof body.phone === "string" && body.phone.trim().length > 0
      ? body.phone
      : session.claims.phone;

  if (!amount || amount < MIN_TOPUP_TZS || amount > MAX_TOPUP_TZS) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (!provider) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const normalized = normalizeTzPhone(providedPhone);
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;

  const admin = supabaseAdmin();
  const reference = generateReference(phone);

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      user_id: session.claims.userId,
      kind: "topup",
      amount_tzs: amount,
      provider,
      evmark_reference_id: reference,
    })
    .select("id")
    .single();
  if (payErr || !payment) {
    console.error("[wallet-topup] payment insert failed", payErr);
    return NextResponse.json(
      { error: "unknown", detail: payErr?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  const push = await pushMno({
    amount,
    productLabel: "Ubepari Wallet top-up",
    mobileNo: phone,
    reference,
    provider,
  });

  if (!push.ok) {
    console.error("[wallet-topup] evmark push failed", push.reason);
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
    amount,
  });
}
