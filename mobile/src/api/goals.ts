import { apiJson } from "./client";
import type { Goal, GoalTerm, MnoProvider, Payment, Contribution } from "@/types/api";

export async function listGoals(): Promise<Goal[]> {
  const res = await apiJson<{ goals: Goal[] }>("/api/goals");
  return res.goals;
}

export type GoalDetail = {
  goal: Goal;
  productName: string;
  contributions: Contribution[];
};

export async function getGoalDetail(id: string): Promise<GoalDetail> {
  return apiJson<GoalDetail>(`/api/goals/${encodeURIComponent(id)}`);
}

export type CreateGoalInput = {
  productSlug: string;
  termMonths: GoalTerm;
};

export type CreateGoalResult = {
  goalId: string;
  reference: string;
  monthlyTarget: number;
};

export async function createGoal(input: CreateGoalInput): Promise<CreateGoalResult> {
  const res = await apiJson<{ ok: true } & CreateGoalResult>("/api/goals", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { goalId: res.goalId, reference: res.reference, monthlyTarget: res.monthlyTarget };
}

export type TopupInput = {
  goalId: string;
  amountTzs: number;
  provider: MnoProvider;
  phone?: string;
};

export type TopupResult = {
  paymentId: string;
  reference: string;
  provider: MnoProvider;
  amount: number;
};

export async function topupGoal({ goalId, ...body }: TopupInput): Promise<TopupResult> {
  const res = await apiJson<{ ok: true } & TopupResult>(
    `/api/goals/${encodeURIComponent(goalId)}/topup`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return res;
}

export async function cancelGoal(goalId: string, reason?: string): Promise<void> {
  await apiJson(`/api/goals/${encodeURIComponent(goalId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function getPayment(id: string): Promise<Payment> {
  const res = await apiJson<{ payment: Payment }>(`/api/payments/${encodeURIComponent(id)}`);
  return res.payment;
}

export function receiptUrl(goalId: string): string {
  return `/api/goals/${encodeURIComponent(goalId)}/receipt.pdf`;
}
