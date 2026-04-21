import { NextResponse, type NextRequest } from "next/server";

import { normalizeTzPhone } from "@/lib/phone";
import { verifyChallenge } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mintAccessToken, setSessionCookie } from "@/lib/session";
import { logEvent } from "@/lib/events";

type VerifyBody = {
  phone?: unknown;
  code?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
};

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const phoneRaw = typeof body.phone === "string" ? body.phone : "";
  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(codeRaw)) {
    return NextResponse.json({ error: "wrong" }, { status: 400 });
  }
  const normalized = normalizeTzPhone(phoneRaw);
  if (!normalized.valid) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const phone = normalized.value;

  const verification = await verifyChallenge(phone, codeRaw);
  if (!verification.ok) {
    const code = verification.code === "not_found" ? "expired" : verification.code;
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const firstName = str(body.firstName);
  const lastName = str(body.lastName);
  const email = str(body.email);

  const admin = supabaseAdmin();

  const { data: existing, error: existingErr } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("phone", phone)
    .maybeSingle();
  if (existingErr) {
    return NextResponse.json({ error: "unknown", detail: existingErr.message }, { status: 500 });
  }

  let userId: string;
  let userEmail: string | null;

  if (existing) {
    userId = existing.id;
    userEmail = existing.email ?? email;
    const updates: {
      first_name?: string;
      last_name?: string;
      email?: string;
    } = {};
    if (firstName && !existing.first_name) updates.first_name = firstName;
    if (lastName && !existing.last_name) updates.last_name = lastName;
    if (email && !existing.email) updates.email = email;
    if (Object.keys(updates).length > 0) {
      await admin.from("profiles").update(updates).eq("id", userId);
    }
  } else {
    const createRes = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: email ?? undefined,
      email_confirm: email ? true : undefined,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });
    if (createRes.error || !createRes.data.user) {
      return NextResponse.json(
        { error: "unknown", detail: createRes.error?.message ?? "createUser failed" },
        { status: 500 },
      );
    }
    userId = createRes.data.user.id;
    userEmail = email;

    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      phone,
      first_name: firstName,
      last_name: lastName,
      email,
    });
    if (profileErr) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "unknown", detail: profileErr.message },
        { status: 500 },
      );
    }
  }

  const token = await mintAccessToken({ userId, phone, email: userEmail });
  await setSessionCookie(token);

  logEvent("otp.verified", { userId, phone, newUser: !existing });
  return NextResponse.json({ ok: true, userId });
}
