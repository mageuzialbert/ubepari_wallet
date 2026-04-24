import { NextResponse } from "next/server";

import { requireSupabaseForUser } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await requireSupabaseForUser(req);
    const { id } = await params;

    const { data, error } = await client
      .from("payments")
      .select("id, kind, amount_tzs, provider, status, settled_at, evmark_ref")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "unknown", detail: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ payment: data });
  } catch (err) {
    if (err instanceof Error && err.message === "unauthenticated") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    throw err;
  }
}
