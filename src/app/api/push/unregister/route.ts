import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const token =
    typeof body.token === "string" && body.token.trim().length > 0
      ? body.token.trim()
      : null;
  if (!token) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("device_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", session.claims.userId)
    .eq("token", token);
  if (error) {
    return NextResponse.json({ error: "unknown", detail: error.message }, { status: 500 });
  }
  logEvent("push.unregistered", { userId: session.claims.userId });
  return NextResponse.json({ ok: true });
}
