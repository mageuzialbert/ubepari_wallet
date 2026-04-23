"use client";

import type { CardPayload } from "@/lib/assistant/tools";
import { ContributionCard } from "./contribution-card";
import { GoalCard } from "./goal-card";
import { GoalPlanCard } from "./goal-plan-card";
import { ProductCard } from "./product-card";

export function AssistantCard({ card }: { card: CardPayload }) {
  switch (card.kind) {
    case "product":
      return <ProductCard {...card} />;
    case "goal":
      return <GoalCard {...card} />;
    case "goalPlan":
      return <GoalPlanCard {...card} />;
    case "contribution":
      return <ContributionCard {...card} />;
  }
}
