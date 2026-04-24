import "server-only";

import type { GoalsRow } from "@/lib/supabase/types";

export type GoalView = {
  id: string;
  reference: string;
  productSlug: string;
  productPrice: number;
  targetMonths: number;
  monthlyTarget: number;
  contributedTzs: number;
  status: GoalsRow["status"];
  createdAt: string;
  nextReminderDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  receiptNumber: string | null;
  receiptIssuedAt: string | null;
};

export function toGoalView(row: GoalsRow): GoalView {
  return {
    id: row.id,
    reference: row.reference,
    productSlug: row.product_slug,
    productPrice: row.product_price_tzs,
    targetMonths: row.target_months,
    monthlyTarget: row.monthly_target_tzs,
    contributedTzs: row.contributed_tzs,
    status: row.status,
    createdAt: row.created_at,
    nextReminderDate: row.next_reminder_date,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    receiptNumber: row.receipt_number,
    receiptIssuedAt: row.receipt_issued_at,
  };
}

export type ContributionRow = {
  id: string;
  amount_tzs: number;
  status: "pending" | "success" | "failed";
  provider: string;
  evmark_reference_id: string | null;
  created_at: string;
  settled_at: string | null;
};

export type ContributionView = {
  id: string;
  amountTzs: number;
  provider: string;
  status: "pending" | "success" | "failed";
  evmarkReferenceId: string | null;
  createdAt: string;
  settledAt: string | null;
};

export function toContributionView(row: ContributionRow): ContributionView {
  return {
    id: row.id,
    amountTzs: row.amount_tzs,
    provider: row.provider,
    status: row.status,
    evmarkReferenceId: row.evmark_reference_id,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}
