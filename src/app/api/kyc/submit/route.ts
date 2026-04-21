import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const userId = session.claims.userId;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const nida = String(form.get("nida") ?? "").replace(/[\s-]/g, "");
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const workplaceRaw = String(form.get("workplace") ?? "").trim();
  const file = form.get("doc");

  if (!/^\d{20}$/.test(nida)) {
    return NextResponse.json({ error: "invalid_nida" }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_doc" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "doc_too_large" }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json({ error: "doc_type" }, { status: 400 });
  }

  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : "jpg";
  const path = `${userId}/id.${ext}`;

  const admin = supabaseAdmin();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await admin.storage
    .from("kyc-documents")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upload.error) {
    console.error("[kyc-submit] storage upload failed", upload.error);
    return NextResponse.json(
      { error: "unknown", detail: upload.error.message },
      { status: 500 },
    );
  }

  const { error: insertErr } = await admin.from("kyc_submissions").insert({
    user_id: userId,
    nida_number: nida,
    legal_first_name: firstName,
    legal_last_name: lastName,
    id_doc_path: path,
    workplace: workplaceRaw || null,
    status: "pending",
  });
  if (insertErr) {
    console.error("[kyc-submit] kyc_submissions insert failed", insertErr);
    return NextResponse.json(
      { error: "unknown", detail: insertErr.message },
      { status: 500 },
    );
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ kyc_status: "pending" })
    .eq("id", userId);
  if (profileErr) {
    console.error("[kyc-submit] profile update failed", profileErr);
    return NextResponse.json(
      { error: "unknown", detail: profileErr.message },
      { status: 500 },
    );
  }

  logEvent("kyc.submitted", { userId, nidaLastFour: nida.slice(-4) });
  return NextResponse.json({ ok: true });
}
