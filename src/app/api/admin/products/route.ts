import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { createProduct } from "@/lib/admin/products";

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await createProduct(body, auth.ctx.userId);
  if (!result.ok) {
    const status = statusFor(result.error);
    return NextResponse.json(
      { error: result.error, issues: result.issues },
      { status },
    );
  }
  return NextResponse.json({ ok: true, id: result.data.id, slug: result.data.slug });
}

function statusFor(err: string): number {
  switch (err) {
    case "bad_input":
      return 400;
    case "slug_in_use":
      return 409;
    default:
      return 500;
  }
}
