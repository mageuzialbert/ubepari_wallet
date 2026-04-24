import { NextResponse, type NextRequest } from "next/server";

import { normalizeTzPhone } from "@/lib/phone";
import { verifyChallenge } from "@/lib/otp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mintSession } from "@/lib/session";
import { logEvent } from "@/lib/events";
import { LEGAL_VERSION } from "@/lib/legal";
import { generateInitialPassword, hashPassword } from "@/lib/password";
import { sendSms } from "@/lib/sms";

type VerifyBody = {
  phone?: unknown;
  code?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  flow?: unknown;
  acceptedTermsVersion?: unknown;
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
  const flow = str(body.flow);
  const acceptedTermsVersion = str(body.acceptedTermsVersion);

  const admin = supabaseAdmin();

  const { data: existing, error: existingErr } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name, terms_version_accepted")
    .eq("phone", phone)
    .maybeSingle();
  if (existingErr) {
    return NextResponse.json({ error: "unknown", detail: existingErr.message }, { status: 500 });
  }

  // Signup flow, or any new-user creation, must carry current-version consent.
  const isNewUser = !existing;
  if ((flow === "signup" || isNewUser) && acceptedTermsVersion !== LEGAL_VERSION) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
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
      terms_version_accepted?: string;
      terms_accepted_at?: string;
    } = {};
    if (firstName && !existing.first_name) updates.first_name = firstName;
    if (lastName && !existing.last_name) updates.last_name = lastName;
    if (email && !existing.email) updates.email = email;
    if (
      acceptedTermsVersion === LEGAL_VERSION &&
      existing.terms_version_accepted !== LEGAL_VERSION
    ) {
      updates.terms_version_accepted = LEGAL_VERSION;
      updates.terms_accepted_at = new Date().toISOString();
    }
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

    // Generate + hash the user's initial password. We SMS the plaintext once;
    // only the hash lives in the DB. Users can change it via the reset flow.
    const initialPassword = generateInitialPassword();
    const passwordHash = await hashPassword(initialPassword);

    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      phone,
      first_name: firstName,
      last_name: lastName,
      email,
      terms_version_accepted: LEGAL_VERSION,
      terms_accepted_at: new Date().toISOString(),
      password_hash: passwordHash,
      password_set_at: new Date().toISOString(),
    });
    if (profileErr) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "unknown", detail: profileErr.message },
        { status: 500 },
      );
    }

    // SMS is best-effort: if the gateway fails the account still exists and
    // the user can hit the password-reset flow. Log the failure for triage.
    const smsResult = await sendSms(
      phone,
      `Karibu Ubepari. Nenosiri lako: ${initialPassword}. Lihifadhi vizuri. | Your password: ${initialPassword}`,
    );
    if (!smsResult.ok) {
      logEvent("password.initial_sms_failed", { userId, phone, reason: smsResult.reason });
    }
  }

  const { token, expiresAt } = await mintSession({ userId, phone, email: userEmail });

  logEvent("otp.verified", { userId, phone, newUser: !existing });
  return NextResponse.json({ ok: true, userId, newUser: !existing, token, expiresAt });
}
