import { NextResponse } from "next/server";

import { getGoalDetail } from "@/lib/goals";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const detail = await getGoalDetail(session.claims.userId, id);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}
