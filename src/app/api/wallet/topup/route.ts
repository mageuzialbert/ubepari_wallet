import { NextResponse } from "next/server";

// Free-floating wallet top-up is retired. Contributions now attach to a goal
// via POST /api/goals/[id]/topup.
export async function POST() {
  return NextResponse.json(
    {
      error: "gone",
      message: "Top-ups now happen against a specific goal. See /api/goals/[id]/topup.",
    },
    { status: 410 },
  );
}
