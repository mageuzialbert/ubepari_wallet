import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { reviewKyc } from "@/lib/admin/kyc-actions";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const action = (body as { action?: unknown }).action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const rawNotes = (body as { notes?: unknown }).notes;
  const notes = typeof rawNotes === "string" ? rawNotes : null;

  const result = await reviewKyc({
    actorId: auth.ctx.userId,
    submissionId: id,
    action,
    notes,
  });

  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "self_review_forbidden"
          ? 403
          : result.error === "already_reviewed"
            ? 409
            : result.error === "notes_required"
              ? 400
              : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, smsFailed: result.smsFailed });
}
