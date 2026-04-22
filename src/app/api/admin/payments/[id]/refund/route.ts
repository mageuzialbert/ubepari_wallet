import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { issueRefund } from "@/lib/admin/payments";

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

  const result = await issueRefund({
    actorId: auth.ctx.userId,
    paymentId: id,
    amount: (body as { amount?: unknown }).amount,
    reason: (body as { reason?: unknown }).reason,
  });

  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "bad_input" || result.error === "amount_out_of_range"
          ? 400
          : result.error === "wrong_status" || result.error === "wrong_kind"
            ? 409
            : 500;
    return NextResponse.json(
      { error: result.error, issues: result.issues },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    refundPaymentId: result.data.refundPaymentId,
    amountTzs: result.data.amountTzs,
  });
}
