import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "high";
};

export type ActiveDeviceToken = {
  token: string;
  platform: "ios" | "android" | "web";
};

export async function getActiveTokensFor(userId: string): Promise<ActiveDeviceToken[]> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("device_tokens")
    .select("token, platform")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error || !data) return [];
  return data as ActiveDeviceToken[];
}

// Best-effort push; errors are logged but never thrown — callers shouldn't
// block the cron/reminder pipeline if Expo's service is briefly down.
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<boolean> {
  if (messages.length === 0) return true;
  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      logEvent("push.send_failed", { status: res.status });
      return false;
    }
    return true;
  } catch (err) {
    logEvent("push.send_error", { message: err instanceof Error ? err.message : "unknown" });
    return false;
  }
}
