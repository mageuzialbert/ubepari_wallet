import { apiJson } from "@/lib/api/client";
import type {
  Goal,
  MnoProvider,
  WalletBalance,
  WalletEntry,
} from "@/types/api";

export async function getWalletBalance(): Promise<WalletBalance> {
  const res = await apiJson<{ ok: true } & WalletBalance>("/api/wallet/balance");
  return {
    availableTzs: res.availableTzs,
    allocatedTzs: res.allocatedTzs,
    totalTzs: res.totalTzs,
  };
}

export async function listWalletEntries(limit = 25): Promise<WalletEntry[]> {
  const res = await apiJson<{ ok: true; entries: WalletEntry[] }>(
    `/api/wallet/entries?limit=${limit}`,
  );
  return res.entries;
}

export type WalletTopupInput = {
  amountTzs: number;
  provider: MnoProvider;
  phone?: string;
};

export type WalletTopupResult = {
  paymentId: string;
  reference: string;
  provider: MnoProvider;
  amount: number;
};

export async function walletTopup(input: WalletTopupInput): Promise<WalletTopupResult> {
  const res = await apiJson<{ ok: true } & WalletTopupResult>("/api/wallet/topup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res;
}

export type AllocateInput = {
  goalId: string;
  amountTzs: number;
};

export type AllocateResult = {
  goal: Goal;
  completed: boolean;
};

export async function allocateToGoal(input: AllocateInput): Promise<AllocateResult> {
  const res = await apiJson<{ ok: true } & AllocateResult>("/api/wallet/allocate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { goal: res.goal, completed: res.completed };
}
