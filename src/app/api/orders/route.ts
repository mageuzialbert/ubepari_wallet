import { NextResponse } from "next/server";

// Hire-purchase order creation is retired. The app now uses layaway goals.
// See /api/goals. Respond 410 Gone so any lingering client retries surface
// immediately rather than silently succeeding.
export async function POST() {
  return NextResponse.json(
    {
      error: "gone",
      message: "Order creation has moved to /api/goals.",
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}
