import { NextResponse } from "next/server";

// Installment payments are retired — no more installment debts to settle.
// Users contribute to goals freely via /api/goals/[id]/topup.
export async function POST() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}
