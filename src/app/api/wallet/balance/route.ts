import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/session";
import { getWalletBalance } from "@/lib/wallet";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const balance = await getWalletBalance(session.claims.userId);
  return NextResponse.json({
    ok: true,
    availableTzs: balance.availableTzs,
    allocatedTzs: balance.allocatedTzs,
    totalTzs: balance.totalTzs,
  });
}
