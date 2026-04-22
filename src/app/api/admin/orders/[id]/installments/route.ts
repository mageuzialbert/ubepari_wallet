import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { adjustInstallmentSchedule } from "@/lib/admin/orders";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await adjustInstallmentSchedule({
    actorId: auth.ctx.userId,
    orderId: id,
    updates: (body as { updates?: unknown }).updates,
    reason: (body as { reason?: unknown }).reason,
  });

  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "bad_input"
          ? 400
          : 500;
    return NextResponse.json(
      { error: result.error, issues: result.issues },
      { status },
    );
  }

  return NextResponse.json({ ok: true, updated: result.data.updated });
}
