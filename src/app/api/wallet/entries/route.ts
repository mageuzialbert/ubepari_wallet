import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/session";
import { listWalletEntries } from "@/lib/wallet";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const rawLimit = req.nextUrl.searchParams.get("limit");
  const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : DEFAULT_LIMIT;
  const limit =
    Number.isFinite(parsed) && parsed > 0
      ? Math.min(parsed, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const entries = await listWalletEntries(session.claims.userId, limit);
  return NextResponse.json({ ok: true, entries });
}
