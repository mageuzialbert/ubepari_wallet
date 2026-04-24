import { NextResponse, type NextRequest } from "next/server";

import { generateReference, pushMno, type EvmarkProvider } from "@/lib/evmark";
import { logEvent } from "@/lib/events";
import { hasPendingPush } from "@/lib/payments";
import { normalizeTzPhone } from "@/lib/phone";
import { getSessionFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED: EvmarkProvider[] = ["mpesa", "tigopesa", "airtelmoney"];
const MIN_TZS = 1000;
const MAX_TZS = 5_000_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id: goalId } = await params;

  const body = (await req.json().catch(() => null)) as
    | { amountTzs?: unknown; provider?: unknown; phone?: unknown }
    | null;
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

  if (!amount || amount < MIN_TZS || amount > MAX_TZS) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  if (!provider) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const normalized = normalizeTzPhone(providedPhone);
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;

  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("kyc_status")
    .eq("id", session.claims.userId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "profile_missing" }, { status: 500 });
  if (profile.kyc_status !== "approved") {
    return NextResponse.json({ error: "kyc_not_approved" }, { status: 403 });
  }

  const { data: goal } = await admin
    .from("goals")
    .select("id, status, product_slug, product_price_tzs, contributed_tzs, reference")
    .eq("id", goalId)
    .eq("user_id", session.claims.userId)
    .maybeSingle();
  if (!goal) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (goal.status !== "active") {
    return NextResponse.json({ error: "not_active" }, { status: 409 });
  }

  if (await hasPendingPush(session.claims.userId)) {
    return NextResponse.json({ error: "pending_push" }, { status: 429 });
  }

  const reference = generateReference(phone);
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      user_id: session.claims.userId,
      goal_id: goal.id,
      kind: "contribution",
      amount_tzs: amount,
      provider,
      evmark_reference_id: reference,
    })
    .select("id")
    .single();
  if (payErr || !payment) {
    return NextResponse.json(
      { error: "unknown", detail: payErr?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  const push = await pushMno({
    amount,
    productLabel: `Ubepari goal ${goal.reference}`,
    mobileNo: phone,
    reference,
    provider,
  });

  if (!push.ok) {
    logEvent("payment.push_failed", {
      kind: "contribution",
      userId: session.claims.userId,
      goalId: goal.id,
      reference,
      reason: push.reason,
    });
    await admin
      .from("payments")
      .update({
        status: "failed",
        raw_callback: {
          source: "push_failed",
          reason: push.reason,
          evmark_response: push.raw ?? null,
        },
        settled_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    return NextResponse.json(
      { error: "push_failed", detail: push.reason },
      { status: 502 },
    );
  }

  logEvent("payment.pushed", {
    kind: "contribution",
    userId: session.claims.userId,
    goalId: goal.id,
    paymentId: payment.id,
    reference,
    amount,
    provider,
  });

  return NextResponse.json({
    ok: true,
    paymentId: payment.id,
    reference,
    provider,
    amount,
  });
}
