export type GoalTerm = 3 | 6 | 9 | 12;

export const GOAL_TERMS: GoalTerm[] = [3, 6, 9, 12];

export type GoalPlan = {
  priceTzs: number;
  term: GoalTerm;
  monthlyTarget: number;
};

export function computeMonthlyTarget(priceTzs: number, term: GoalTerm): number {
  return Math.ceil(priceTzs / term / 1000) * 1000;
}

export function computeGoalPlan(priceTzs: number, term: GoalTerm): GoalPlan {
  return { priceTzs, term, monthlyTarget: computeMonthlyTarget(priceTzs, term) };
}
