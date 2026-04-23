import { NextResponse, type NextRequest } from "next/server";

import { logEvent } from "@/lib/events";
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_ATTEMPTS,
  verifyPassword,
} from "@/lib/password";
import { normalizeTzPhone } from "@/lib/phone";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { mintAccessToken, setSessionCookie } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const ipRate = checkRate(`password-login:ip:${ip}`, 20, 60 * 60);
  if (!ipRate.ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as
    | { phone?: unknown; password?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const normalized =
    typeof body.phone === "string" ? normalizeTzPhone(body.phone) : { valid: false as const };
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;
  const password =
    typeof body.password === "string" && body.password.length > 0
      ? body.password
      : null;
  if (!password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, phone, email, password_hash, password_failed_attempts, password_locked_until, deleted_at",
    )
    .eq("phone", phone)
    .maybeSingle();

  // Use a uniform error for missing profile + bad password so we don't leak
  // which phones are registered.
  if (!profile || profile.deleted_at || !profile.password_hash) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (
    profile.password_locked_until &&
    new Date(profile.password_locked_until).getTime() > Date.now()
  ) {
    return NextResponse.json({ error: "locked" }, { status: 423 });
  }

  const match = await verifyPassword(password, profile.password_hash);
  if (!match) {
    const nextAttempts = (profile.password_failed_attempts ?? 0) + 1;
    const update: {
      password_failed_attempts: number;
      password_locked_until?: string;
    } = { password_failed_attempts: nextAttempts };
    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      update.password_locked_until = new Date(
        Date.now() + LOCKOUT_MINUTES * 60 * 1000,
      ).toISOString();
    }
    await admin.from("profiles").update(update).eq("id", profile.id);
    logEvent("password.login_failed", { userId: profile.id, nextAttempts });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await admin
    .from("profiles")
    .update({ password_failed_attempts: 0, password_locked_until: null })
    .eq("id", profile.id);

  const token = await mintAccessToken({
    userId: profile.id,
    phone,
    email: profile.email ?? null,
  });
  await setSessionCookie(token);

  logEvent("password.login_ok", { userId: profile.id });
  return NextResponse.json({ ok: true, userId: profile.id });
}
