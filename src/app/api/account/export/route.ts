import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildZip, zipResponse, type ZipEntry } from "@/lib/export/zip";
import { logEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = session.claims.userId;

  const admin = supabaseAdmin();

  const [
    profileRes,
    ordersRes,
    installmentsRes,
    paymentsRes,
    walletRes,
    kycRes,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    admin
      .from("order_installments")
      .select("*, orders!inner(user_id)")
      .eq("orders.user_id", userId)
      .order("due_date", { ascending: true }),
    admin
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    admin
      .from("wallet_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    admin
      .from("kyc_submissions")
      .select(
        "id, nida_number, legal_first_name, legal_last_name, workplace, status, submitted_at, reviewed_at, review_notes, id_doc_wiped_at",
      )
      .eq("user_id", userId)
      .order("submitted_at", { ascending: true }),
  ]);

  if (profileRes.error || !profileRes.data) {
    logEvent("account.export_failed", { userId, stage: "profile", reason: profileRes.error?.message });
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  // Drop sensitive / system-only columns from KYC history — we keep nida_number
  // because the user originally provided it and it's their own data. The ID doc
  // binary is intentionally not exported (it was uploaded to Storage and is
  // removed on account deletion).
  const generatedAt = new Date().toISOString();

  const bundle = {
    schema: "ubepari.account-export.v1",
    generated_at: generatedAt,
    user_id: userId,
    profile: profileRes.data,
    orders: ordersRes.data ?? [],
    installments: (installmentsRes.data ?? []).map((row) => {
      const clone: Record<string, unknown> = { ...(row as Record<string, unknown>) };
      delete clone.orders;
      return clone;
    }),
    payments: paymentsRes.data ?? [],
    wallet_entries: walletRes.data ?? [],
    kyc_submissions: kycRes.data ?? [],
  };

  const readme = [
    "Ubepari Wallet — account data export",
    `Generated: ${generatedAt}`,
    `User ID: ${userId}`,
    "",
    "Files:",
    "  profile.json           — your profile row",
    "  orders.json            — every order you placed",
    "  installments.json      — installment schedules for those orders",
    "  payments.json          — deposits, installments, top-ups, refunds",
    "  wallet_entries.json    — credit/debit entries behind your wallet balance",
    "  kyc_submissions.json   — KYC metadata (the uploaded document binary is not included)",
    "  bundle.json            — all of the above in a single JSON file",
    "",
    "This export is a snapshot at the time of request. Nothing here is stored",
    "after the download; re-export if you need fresh data.",
    "",
  ].join("\n");

  const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
  const entries: ZipEntry[] = [
    { path: "README.txt", data: readme },
    { path: "profile.json", data: json(bundle.profile) },
    { path: "orders.json", data: json(bundle.orders) },
    { path: "installments.json", data: json(bundle.installments) },
    { path: "payments.json", data: json(bundle.payments) },
    { path: "wallet_entries.json", data: json(bundle.wallet_entries) },
    { path: "kyc_submissions.json", data: json(bundle.kyc_submissions) },
    { path: "bundle.json", data: json(bundle) },
  ];

  const zip = buildZip(entries);

  logEvent("account.exported", {
    userId,
    orders: bundle.orders.length,
    payments: bundle.payments.length,
    walletEntries: bundle.wallet_entries.length,
  });

  const stamp = generatedAt.slice(0, 10);
  return zipResponse(`ubepari-account-${userId.slice(0, 8)}-${stamp}.zip`, zip);
}
