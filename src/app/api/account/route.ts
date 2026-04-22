import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/session";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events";

type PatchError = "invalid_email" | "name_too_long" | "unknown";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX = 60;

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const firstName = cleanString(body.firstName);
  const lastName = cleanString(body.lastName);
  const email = cleanString(body.email);

  if (firstName && firstName.length > NAME_MAX) {
    return NextResponse.json<{ error: PatchError }>(
      { error: "name_too_long" },
      { status: 400 },
    );
  }
  if (lastName && lastName.length > NAME_MAX) {
    return NextResponse.json<{ error: PatchError }>(
      { error: "name_too_long" },
      { status: 400 },
    );
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json<{ error: PatchError }>(
      { error: "invalid_email" },
      { status: 400 },
    );
  }

  const { client, userId } = await requireSupabaseForUser();

  const { data, error } = await client
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
    })
    .eq("id", userId)
    .select("first_name, last_name, email")
    .maybeSingle();

  if (error) {
    console.error("[account-patch] update failed", error);
    return NextResponse.json<{ error: PatchError }>(
      { error: "unknown" },
      { status: 500 },
    );
  }

  logEvent("account.updated", { userId });

  return NextResponse.json({
    ok: true,
    profile: {
      firstName: data?.first_name ?? null,
      lastName: data?.last_name ?? null,
      email: data?.email ?? null,
    },
  });
}
