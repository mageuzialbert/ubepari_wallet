import { NextResponse, type NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { setAdminRole } from "@/lib/admin/users";

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

  const grant = Boolean((body as { grant?: unknown }).grant);
  const reason = (body as { reason?: unknown }).reason;

  const result = await setAdminRole({
    actorId: auth.ctx.userId,
    actorIsRoot: auth.ctx.isRoot,
    userId: id,
    grant,
    reason,
  });

  if (!result.ok) {
    const status =
      result.error === "forbidden" || result.error === "root_demotion_forbidden"
        ? 403
        : result.error === "self_edit_forbidden"
          ? 409
          : result.error === "not_found"
            ? 404
            : result.error === "bad_input"
              ? 400
              : 500;
    return NextResponse.json({ error: result.error, issues: result.issues }, { status });
  }

  return NextResponse.json({ ok: true, isAdmin: result.data.isAdmin });
}
