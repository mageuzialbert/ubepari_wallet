import { apiFetch, apiJson } from "@/lib/api/client";

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type Profile = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const res = await apiJson<{ ok: true; profile: Profile }>("/api/account", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.profile;
}

export async function exportAccountData(): Promise<string> {
  const res = await apiFetch("/api/account/export", { method: "GET" });
  if (!res.ok) throw new Error("export_failed");
  return res.text();
}

export async function sendDeleteOtp(): Promise<void> {
  await apiJson("/api/account/delete/send-otp", { method: "POST" });
}

export async function confirmDelete(code: string): Promise<void> {
  await apiJson("/api/account/delete/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
