import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale } from "@/i18n/config";
import { getDictionary } from "@/app/[locale]/dictionaries";
import { normalizeTzPhone } from "@/lib/phone";
import { canRequestOtp, createChallenge, generateOtpCode } from "@/lib/otp";
import { sendSms } from "@/lib/sms";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/events";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ipRate = checkRate(`otp-send:ip:${ip}`, 5, 60 * 60);
  if (!ipRate.ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const phoneRaw = (body as { phone?: unknown }).phone;
  if (typeof phoneRaw !== "string") {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const normalized = normalizeTzPhone(phoneRaw);
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
    logEvent("otp.sms_failed", { phone, reason: result.reason });
    return NextResponse.json({ error: "sms_failed", detail: result.reason }, { status: 502 });
  }

  logEvent("otp.sent", { phone });
  return NextResponse.json({ ok: true, phone });
}
