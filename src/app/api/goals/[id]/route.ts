import { NextResponse } from "next/server";

import { toContributionView, toGoalView } from "@/lib/goal-view";
import { getGoalDetail } from "@/lib/goals";
import { getProduct } from "@/lib/products";
import { getSessionFromRequest } from "@/lib/session";
import { defaultLocale } from "@/i18n/config";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const detail = await getGoalDetail(session.claims.userId, id);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const product = await getProduct(detail.goal.product_slug, defaultLocale).catch(() => null);

  return NextResponse.json({
    goal: toGoalView(detail.goal),
    productName: product?.name ?? null,
    productImage: product?.images?.[0] ?? null,
    productColorAccent: product?.colorAccent ?? null,
    contributions: detail.contributions.map(toContributionView),
  });
}
