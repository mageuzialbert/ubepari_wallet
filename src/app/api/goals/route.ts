import { NextResponse, type NextRequest } from "next/server";

import { GOAL_TERMS, type GoalTerm } from "@/lib/goal";
import { toGoalView } from "@/lib/goal-view";
import { createGoal, listGoalsForUser } from "@/lib/goals";
import { getProductsBySlugs } from "@/lib/products";
import { getSessionFromRequest } from "@/lib/session";
import { defaultLocale } from "@/i18n/config";

function asTerm(v: unknown): GoalTerm | null {
  return typeof v === "number" && (GOAL_TERMS as number[]).includes(v)
    ? (v as GoalTerm)
    : null;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const goals = await listGoalsForUser(session.claims.userId);
  const products = await getProductsBySlugs(
    goals.map((g) => g.product_slug),
    defaultLocale,
  );
  return NextResponse.json({
    goals: goals.map((g) => {
      const view = toGoalView(g);
      const product = products.get(g.product_slug) ?? null;
      return {
        ...view,
        productName: product?.name ?? null,
        productImage: product?.images?.[0] ?? null,
        productColorAccent: product?.colorAccent ?? null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { productSlug?: unknown; termMonths?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const productSlug =
    typeof body.productSlug === "string" && body.productSlug.trim().length > 0
      ? body.productSlug
      : null;
  const term = asTerm(body.termMonths);
  if (!productSlug || !term) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await createGoal({
    userId: session.claims.userId,
    productSlug,
    termMonths: term,
  });
  if (!result.ok) {
    const statusMap: Record<string, number> = {
      kyc_not_approved: 403,
      product_not_found: 404,
      too_many_active: 409,
      profile_missing: 500,
      db_error: 500,
    };
    return NextResponse.json(
      { error: result.code, detail: result.detail },
      { status: statusMap[result.code] ?? 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    goalId: result.goal.id,
    reference: result.goal.reference,
    monthlyTarget: result.monthlyTarget,
  });
}
