import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/app/[locale]/dictionaries";
import { clearSessionCookie, getSession } from "@/lib/session";
import { verifyChallenge } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { logEvent } from "@/lib/events";

type ConfirmBody = { code?: unknown };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "wrong" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const userId = session.claims.userId;

  const { data: profile } = await admin
    .from("profiles")
    .select("phone, deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.deleted_at || !profile.phone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const phone = profile.phone;

  const verification = await verifyChallenge(phone, code);
  if (!verification.ok) {
    const mapped = verification.code === "not_found" ? "expired" : verification.code;
    return NextResponse.json({ error: mapped }, { status: 400 });
  }

  // 1) Wipe KYC binaries from Storage. Files live at `{userId}/...`.
  const { data: kycObjects } = await admin.storage.from("kyc-documents").list(userId);
  if (kycObjects && kycObjects.length > 0) {
    const paths = kycObjects.map((o) => `${userId}/${o.name}`);
    await admin.storage.from("kyc-documents").remove(paths);
  }
  await admin
    .from("kyc_submissions")
    .update({ id_doc_wiped_at: new Date().toISOString() })
    .eq("user_id", userId);

  // 2) Anonymize the profile. We keep id/orders/payments for retention.
  const suffix = randomBytes(3).toString("hex");
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      phone: null,
      email: null,
      first_name: "Deleted",
      last_name: `User-${suffix}`,
      deleted_at: new Date().toISOString(),
      is_admin: false,
    })
    .eq("id", userId);
  if (profileErr) {
    logEvent("account.delete_failed", { userId, stage: "profile", reason: profileErr.message });
    return NextResponse.json({ error: "unknown", detail: profileErr.message }, { status: 500 });
  }

  // 3) Delete the auth user so the phone number is freed for re-signup.
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    logEvent("account.delete_failed", { userId, stage: "auth", reason: authErr.message });
    // The profile is already anonymized; we surface the error so ops can clean
    // up the orphaned auth row manually.
    return NextResponse.json({ error: "unknown", detail: authErr.message }, { status: 500 });
  }

  // 4) Clear session + fire receipt SMS (best effort).
  await clearSessionCookie();

  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && hasLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = await getDictionary(locale);
  const receipt = await sendSms(phone, dict.account.delete.smsReceipt);
  if (!receipt.ok) {
    logEvent("account.delete_receipt_failed", { userId, reason: receipt.reason });
  }

  logEvent("account.deleted", { userId });
  return NextResponse.json({ ok: true });
}
