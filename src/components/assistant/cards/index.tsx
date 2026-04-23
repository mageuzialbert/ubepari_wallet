"use client";

import type { CardPayload } from "@/lib/assistant/tools";
import { ProductCard } from "./product-card";
import { OrderCard } from "./order-card";
import { InstallmentCard } from "./installment-card";
import { PlanCard } from "./plan-card";

export function AssistantCard({ card }: { card: CardPayload }) {
  switch (card.kind) {
    case "product":
      return <ProductCard {...card} />;
    case "order":
      return <OrderCard {...card} />;
    case "installment":
      return <InstallmentCard {...card} />;
    case "plan":
      return <PlanCard {...card} />;
  }
}
