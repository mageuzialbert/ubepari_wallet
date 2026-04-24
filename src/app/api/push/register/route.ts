import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

type DevicePlatform = "ios" | "android" | "web";
const ALLOWED_PLATFORMS: readonly DevicePlatform[] = ["ios", "android", "web"];
function isDevicePlatform(value: unknown): value is DevicePlatform {
  return typeof value === "string" && (ALLOWED_PLATFORMS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { token?: unknown; platform?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const token = typeof body.token === "string" && body.token.trim().length > 0
    ? body.token.trim()
    : null;
  const platform = isDevicePlatform(body.platform) ? body.platform : null;
  if (!token || !platform) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  // Upsert — if the same token exists we just update user/platform/last-seen.
  const { error } = await admin
    .from("device_tokens")
    .upsert(
      {
        user_id: session.claims.userId,
        token,
        platform,
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: "token" },
    );
  if (error) {
    return NextResponse.json({ error: "unknown", detail: error.message }, { status: 500 });
  }
  logEvent("push.registered", { userId: session.claims.userId, platform });
  return NextResponse.json({ ok: true });
}
