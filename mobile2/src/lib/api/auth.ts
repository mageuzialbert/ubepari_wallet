import { apiJson } from "@/lib/api/client";
import type { StoredSession } from "@/lib/auth/token-storage";
import type { User } from "@/types/api";

// Must match backend's current LEGAL_VERSION; signup will reject otherwise.
export const LEGAL_VERSION = "2026-04";

type OkWithToken = {
  ok: true;
  userId: string;
  token: string;
  expiresAt: string;
};

export async function checkPhoneExists(phone: string): Promise<boolean> {
  const res = await apiJson<{ ok: true; exists: boolean }>(
    "/api/auth/phone-exists",
    {
      method: "POST",
      body: JSON.stringify({ phone }),
    },
  );
  return res.exists;
}

export async function sendOtp(phone: string): Promise<{ phone: string }> {
  const res = await apiJson<{ ok: true; phone: string }>("/api/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return { phone: res.phone };
}

export type VerifyOtpInput = {
  phone: string;
  code: string;
  flow: "signup" | "login";
  firstName?: string;
  lastName?: string;
  email?: string;
  acceptedTermsVersion?: string;
};

export async function verifyOtp(
  input: VerifyOtpInput,
): Promise<{ session: StoredSession; userId: string; newUser: boolean }> {
  const res = await apiJson<OkWithToken & { newUser: boolean }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    session: { token: res.token, expiresAt: res.expiresAt },
    userId: res.userId,
    newUser: res.newUser,
  };
}

export async function passwordLogin(
  phone: string,
  password: string,
): Promise<{ session: StoredSession; userId: string }> {
  const res = await apiJson<OkWithToken>("/api/auth/password/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  return {
    session: { token: res.token, expiresAt: res.expiresAt },
    userId: res.userId,
  };
}

export async function requestPasswordReset(phone: string): Promise<void> {
  await apiJson("/api/auth/password/reset/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function confirmPasswordReset(
  phone: string,
  code: string,
  newPassword: string,
): Promise<{ session: StoredSession; userId: string }> {
  const res = await apiJson<OkWithToken>("/api/auth/password/reset/confirm", {
    method: "POST",
    body: JSON.stringify({ phone, code, newPassword }),
  });
  return {
    session: { token: res.token, expiresAt: res.expiresAt },
    userId: res.userId,
  };
}

export async function fetchMe(): Promise<User | null> {
  const res = await apiJson<{ user: User | null }>("/api/auth/me", { method: "GET" });
  return res.user;
}

export async function signOut(): Promise<void> {
  try {
    await apiJson("/api/auth/signout", { method: "POST" });
  } catch {
    // best-effort: server-side failure doesn't block local sign-out
  }
}
