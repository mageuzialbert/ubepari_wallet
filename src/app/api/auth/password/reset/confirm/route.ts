import { NextResponse, type NextRequest } from "next/server";

import { logEvent } from "@/lib/events";
import { verifyChallenge } from "@/lib/otp";
import { hashPassword, isAcceptablePassword } from "@/lib/password";
import { normalizeTzPhone } from "@/lib/phone";
import { mintSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { phone?: unknown; code?: unknown; newPassword?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const normalized =
    typeof body.phone === "string" ? normalizeTzPhone(body.phone) : { valid: false as const };
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;

  if (!(typeof body.code === "string" && /^\d{6}$/.test(body.code))) {
    return NextResponse.json({ error: "wrong" }, { status: 400 });
  }
  if (!isAcceptablePassword(body.newPassword)) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const verification = await verifyChallenge(phone, body.code);
  if (!verification.ok) {
    const code = verification.code === "not_found" ? "expired" : verification.code;
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, deleted_at")
    .eq("phone", phone)
    .maybeSingle();
  if (!profile || profile.deleted_at) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const hash = await hashPassword(body.newPassword);
  await admin
    .from("profiles")
    .update({
      password_hash: hash,
      password_set_at: new Date().toISOString(),
      password_failed_attempts: 0,
      password_locked_until: null,
    })
    .eq("id", profile.id);

  const { token, expiresAt } = await mintSession({
    userId: profile.id,
    phone,
    email: profile.email ?? null,
  });

  logEvent("password.reset_completed", { userId: profile.id });
  return NextResponse.json({ ok: true, userId: profile.id, token, expiresAt });
}
