import { NextResponse, type NextRequest } from "next/server";

import { cancelGoal } from "@/lib/goals";
import { getSession } from "@/lib/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason =
    typeof body.reason === "string" && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : null;

  const result = await cancelGoal(session.claims.userId, id, reason);
  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      not_active: 409,
      db_error: 500,
    };
    return NextResponse.json(
      { error: result.code, detail: result.detail },
      { status: statusMap[result.code] ?? 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
