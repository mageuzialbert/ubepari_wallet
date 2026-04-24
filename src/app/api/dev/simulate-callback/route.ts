import { NextResponse, type NextRequest } from "next/server";

import { dailyHash } from "@/lib/evmark";

// Dev-only helper: Evmark can't reach localhost, so this fakes the callback.
// Usage:
//   curl -X POST http://localhost:3000/api/dev/simulate-callback \
//     -H 'content-type: application/json' \
//     -d '{"reference":"ABCDX712345678","result":"success"}'
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }

  const user = process.env.EVMARK_USER;
  if (!user) return NextResponse.json({ error: "evmark-not-configured" }, { status: 500 });

  const { reference, result, amount, transId } = (await req.json().catch(() => ({}))) as {
    reference?: string;
    result?: "success" | "failed";
    amount?: string | number;
    transId?: string;
  };

  if (!reference) return NextResponse.json({ error: "reference_required" }, { status: 400 });

  const isSuccess = result !== "failed";
  const payload = {
    ResultType: isSuccess ? "Completed" : "Failed",
    TransactionStatus: isSuccess ? "Success" : "Failed",
    TransID: transId ?? `DEV-${Date.now()}`,
    Amount: typeof amount === "number" ? String(amount) : (amount ?? "0"),
    Hash: dailyHash(user),
    ThirdPartyReference: reference,
  };

  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/payments/mno/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));

  return NextResponse.json({
    forwarded: true,
    callbackStatus: res.status,
    callbackBody: body,
    payload,
  });
}
