import { NextResponse, type NextRequest } from "next/server";

import { normalizeTzPhone } from "@/lib/phone";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Pre-flight check used by the mobile signup form to fail fast when a
// phone is already registered, before sending an OTP. Rate-limited per IP
// to prevent bulk phone-number enumeration.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ipRate = checkRate(`phone-exists:ip:${ip}`, 20, 60 * 60);
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

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", normalized.value)
    .is("deleted_at", null)
    .maybeSingle();

  return NextResponse.json({ ok: true, exists: !!data });
}
