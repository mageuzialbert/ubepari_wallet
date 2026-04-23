import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/app/[locale]/dictionaries";
import { logEvent } from "@/lib/events";
import { canRequestOtp, createChallenge, generateOtpCode } from "@/lib/otp";
import { normalizeTzPhone } from "@/lib/phone";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { sendSms } from "@/lib/sms";

// Piggybacks on the OTP challenges table so reset uses the same mechanism
// as signup/signin OTP. We don't reveal whether the phone is registered.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ipRate = checkRate(`password-reset:ip:${ip}`, 5, 60 * 60);
  if (!ipRate.ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const normalized =
    typeof body.phone === "string" ? normalizeTzPhone(body.phone) : { valid: false as const };
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;

  if (!(await canRequestOtp(phone))) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const code = generateOtpCode();
  await createChallenge(phone, code);

  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = localeCookie && hasLocale(localeCookie) ? localeCookie : defaultLocale;
  const dict = await getDictionary(locale);
  const text = dict.otp.smsText.replace("{code}", code);

  const result = await sendSms(phone, text);
  if (!result.ok) {
    logEvent("password.reset_sms_failed", { phone, reason: result.reason });
    return NextResponse.json({ error: "sms_failed", detail: result.reason }, { status: 502 });
  }

  logEvent("password.reset_requested", { phone });
  return NextResponse.json({ ok: true });
}
