import { NextResponse } from "next/server";

import { requireSupabaseForUser } from "@/lib/supabase/server";
import {
  deleteConversation,
  getConversation,
} from "@/lib/assistant/persist";

type Params = Promise<{ id: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
) {
  let session;
  try {
    session = await requireSupabaseForUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const result = await getConversation(session.client, id, session.userId);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Params },
) {
  let session;
  try {
    session = await requireSupabaseForUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteConversation(session.client, id, session.userId);
  if (!ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
