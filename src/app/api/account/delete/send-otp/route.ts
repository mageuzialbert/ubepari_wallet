import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/app/[locale]/dictionaries";
import { getSession } from "@/lib/session";
import { canRequestOtp, createChallenge, generateOtpCode } from "@/lib/otp";
import { sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("phone, deleted_at")
    .eq("id", session.claims.userId)
    .maybeSingle();

  if (!profile || profile.deleted_at || !profile.phone) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const phone = profile.phone;

  if (!(await canRequestOtp(phone))) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const code = generateOtpCode();
  await createChallenge(phone, code);

  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && hasLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = await getDictionary(locale);
  const text = dict.account.delete.smsCode.replace("{code}", code);

  const result = await sendSms(phone, text);
  if (!result.ok) {
    logEvent("account.delete_sms_failed", { userId: session.claims.userId, reason: result.reason });
    return NextResponse.json({ error: "sms_failed", detail: result.reason }, { status: 502 });
  }

  logEvent("account.delete_code_sent", { userId: session.claims.userId });
  return NextResponse.json({ ok: true });
}
