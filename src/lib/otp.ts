import "server-only";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase/admin";

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function canRequestOtp(phone: string): Promise<boolean> {
  const since = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const { data, error } = await supabaseAdmin()
    .from("otp_challenges")
    .select("id")
    .eq("phone", phone)
    .gt("created_at", since)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) === 0;
}

export async function createChallenge(phone: string, code: string): Promise<void> {
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();
  const { error } = await supabaseAdmin().from("otp_challenges").insert({
    phone,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (error) throw error;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; code: "expired" | "wrong" | "too_many_attempts" | "not_found" };

export async function verifyChallenge(
  phone: string,
  submittedCode: string,
): Promise<VerifyResult> {
  const admin = supabaseAdmin();
  const { data: rows, error } = await admin
    .from("otp_challenges")
    .select("id, code_hash, expires_at, consumed_at, attempts")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!rows || rows.length === 0) return { ok: false, code: "not_found" };
  const row = rows[0];

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, code: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, code: "too_many_attempts" };
  }

  const match = await bcrypt.compare(submittedCode, row.code_hash);

  if (!match) {
    await admin
      .from("otp_challenges")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id);
    return { ok: false, code: "wrong" };
  }

  const { error: consumeErr } = await admin
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (consumeErr) throw consumeErr;

  return { ok: true };
}
