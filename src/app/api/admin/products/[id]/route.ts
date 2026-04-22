import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { softDeleteProduct, updateProduct } from "@/lib/admin/products";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await updateProduct(id, body, auth.ctx.userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, issues: result.issues },
      { status: statusFor(result.error) },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const result = await softDeleteProduct(id, auth.ctx.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: statusFor(result.error) });
  }
  return NextResponse.json({ ok: true });
}

function statusFor(err: string): number {
  switch (err) {
    case "not_found":
      return 404;
    case "bad_input":
      return 400;
    case "slug_in_use":
      return 409;
    case "slug_locked":
      return 409;
    default:
      return 500;
  }
}
