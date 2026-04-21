export type CreditTerm = 3 | 6 | 9 | 12;

export const CREDIT_TERMS: CreditTerm[] = [3, 6, 9, 12];

const DEPOSIT_PCT = 0.2;
const APR_BY_TERM: Record<CreditTerm, number> = {
  3: 0.0,
  6: 0.05,
  9: 0.08,
  12: 0.12,
};

export type CreditPlan = {
  price: number;
  term: CreditTerm;
  deposit: number;
  financed: number;
  totalPayable: number;
  monthly: number;
  apr: number;
};

export function computeCreditPlan(price: number, term: CreditTerm): CreditPlan {
  const deposit = Math.round(price * DEPOSIT_PCT);
  const financed = price - deposit;
  const apr = APR_BY_TERM[term];
  const totalFinanced = Math.round(financed * (1 + apr));
  const monthly = Math.ceil(totalFinanced / term / 1000) * 1000;
  const totalPayable = deposit + monthly * term;
  return { price, term, deposit, financed, totalPayable, monthly, apr };
}
