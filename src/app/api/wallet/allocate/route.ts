import { NextResponse, type NextRequest } from "next/server";

import { logEvent } from "@/lib/events";
import { toGoalView } from "@/lib/goal-view";
import { completeGoalIfReached } from "@/lib/goals";
import { getSessionFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GoalsRow } from "@/lib/supabase/types";

const MIN_TZS = 1000;

// Move money from the user's Available bucket into a specific active goal's
// Allocated bucket. Instantaneous (no Evmark push). The RPC is atomic and
// guards sufficient-balance + goal-active invariants.
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { goalId?: unknown; amountTzs?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const goalId = typeof body.goalId === "string" ? body.goalId : null;
  const amount =
    typeof body.amountTzs === "number" && Number.isFinite(body.amountTzs)
      ? Math.floor(body.amountTzs)
      : null;

  if (!goalId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!amount || amount < MIN_TZS) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("kyc_status")
    .eq("id", session.claims.userId)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "profile_missing" }, { status: 500 });
  if (profile.kyc_status !== "approved") {
    return NextResponse.json({ error: "kyc_not_approved" }, { status: 403 });
  }

  const { data, error } = await admin.rpc("allocate_to_goal", {
    p_user_id: session.claims.userId,
    p_goal_id: goalId,
    p_amount: amount,
  });

  if (error) {
    if (error.message.includes("insufficient_available")) {
      return NextResponse.json({ error: "insufficient_available" }, { status: 409 });
    }
    if (error.message.includes("goal_not_active")) {
      return NextResponse.json({ error: "goal_not_active" }, { status: 409 });
    }
    if (error.message.includes("amount_must_be_positive")) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }
    console.error("[wallet-allocate] rpc failed", error);
    return NextResponse.json({ error: "unknown", detail: error.message }, { status: 500 });
  }

  const goal = data as GoalsRow;

  logEvent("wallet.allocated", {
    userId: session.claims.userId,
    goalId,
    amount,
  });

  const completion = await completeGoalIfReached(goal);

  return NextResponse.json({
    ok: true,
    goal: toGoalView(completion.goal),
    completed: completion.kind === "completed",
  });
}
