import { apiJson } from "@/lib/api/client";

export type PushPlatform = "ios" | "android" | "web";

export async function registerPushToken(token: string, platform: PushPlatform): Promise<void> {
  await apiJson("/api/push/register", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await apiJson("/api/push/unregister", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  } catch {
    // best-effort: unregister failures shouldn't block sign-out
  }
}
