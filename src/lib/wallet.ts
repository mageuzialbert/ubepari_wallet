import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { WalletBucket, WalletEntryKind } from "@/lib/supabase/types";

export type WalletBalance = {
  availableTzs: number;
  allocatedTzs: number;
  totalTzs: number;
};

export async function getWalletBalance(userId: string): Promise<WalletBalance> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("wallet_balances")
    .select("bucket, balance_tzs")
    .eq("user_id", userId);

  const rows = data ?? [];
  const pick = (b: WalletBucket): number =>
    Number(rows.find((r) => r.bucket === b)?.balance_tzs ?? 0);

  const availableTzs = pick("available");
  const allocatedTzs = pick("allocated");
  return {
    availableTzs,
    allocatedTzs,
    totalTzs: availableTzs + allocatedTzs,
  };
}

export type WalletActivityEntry = {
  id: string;
  kind: WalletEntryKind;
  bucket: WalletBucket;
  amountTzs: number;
  noteKey: string;
  noteParams: Record<string, unknown>;
  allocationGoalId: string | null;
  paymentId: string | null;
  createdAt: string;
};

export async function listWalletEntries(
  userId: string,
  limit = 25,
): Promise<WalletActivityEntry[]> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("wallet_entries")
    .select(
      "id, kind, bucket, amount_tzs, note_key, note_params, allocation_goal_id, payment_id, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    bucket: row.bucket,
    amountTzs: row.amount_tzs,
    noteKey: row.note_key,
    noteParams: row.note_params,
    allocationGoalId: row.allocation_goal_id,
    paymentId: row.payment_id,
    createdAt: row.created_at,
  }));
}
