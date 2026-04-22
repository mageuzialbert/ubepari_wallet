import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { deleteProductImage, updateImageAlt } from "@/lib/admin/products";

type RouteParams = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id, imageId } = await params;
  if (!id || !imageId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await deleteProductImage(id, imageId, auth.ctx.userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "image_not_found" ? 404 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id, imageId } = await params;
  if (!id || !imageId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const patch: { alt_en?: string | null; alt_sw?: string | null } = {};
  if ("alt_en" in body) {
    const v = (body as { alt_en?: unknown }).alt_en;
    patch.alt_en = typeof v === "string" ? v : null;
  }
  if ("alt_sw" in body) {
    const v = (body as { alt_sw?: unknown }).alt_sw;
    patch.alt_sw = typeof v === "string" ? v : null;
  }

  const result = await updateImageAlt(id, imageId, patch, auth.ctx.userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "image_not_found" ? 404 : 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
