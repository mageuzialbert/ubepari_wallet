import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import {
  reorderProductImages,
  uploadProductImage,
} from "@/lib/admin/products";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "bad_input", issues: { file: "required" } }, { status: 400 });
  }

  const result = await uploadProductImage(id, file, auth.ctx.userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, issues: result.issues },
      { status: statusFor(result.error) },
    );
  }
  return NextResponse.json({
    ok: true,
    image: {
      id: result.data.imageId,
      path: result.data.path,
      url: result.data.url,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const order = (body as { order?: unknown })?.order;
  if (!Array.isArray(order) || !order.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }

  const result = await reorderProductImages(id, order as string[], auth.ctx.userId);
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
    case "image_limit":
      return 409;
    case "storage_error":
      return 502;
    default:
      return 500;
  }
}
