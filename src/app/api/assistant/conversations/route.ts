import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { requireSupabaseForUser } from "@/lib/supabase/server";
import {
  createConversation,
  listConversations,
} from "@/lib/assistant/persist";
import { checkRate } from "@/lib/rate-limit";

export async function GET() {
  let session;
  try {
    session = await requireSupabaseForUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const conversations = await listConversations(session.client, session.userId);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSupabaseForUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rate = checkRate(
    `assistant:conv:create:${session.userId}`,
    5,
    60 * 60,
  );
  if (!rate.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryInSeconds: rate.resetInSeconds },
      { status: 429 },
    );
  }

  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale: Locale =
    cookie && hasLocale(cookie) ? cookie : defaultLocale;

  const created = await createConversation(session.client, session.userId, locale);
  if (!created) {
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }
  return NextResponse.json({ conversation: created });
}
