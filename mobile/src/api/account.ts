import { apiJson } from "./client";

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
