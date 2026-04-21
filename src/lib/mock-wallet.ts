export type WalletSnapshot = {
  user: { name: string; creditLimitTzs: number; creditPoints: number };
  balance: { totalOwedTzs: number; totalPaidTzs: number; nextDueTzs: number; nextDueDate: string };
  activeOrders: {
    id: string;
    productName: string;
    image: string;
    principalTzs: number;
    paidTzs: number;
    termMonths: number;
    monthsPaid: number;
    nextDueDate: string;
    monthlyTzs: number;
  }[];
  recentTransactions: {
    id: string;
    kind: "topup" | "payment" | "deposit" | "refund";
    amountTzs: number;
    provider: "M-Pesa" | "Tigo Pesa" | "Airtel Money" | "Card" | "Wallet";
    at: string;
    note: string;
  }[];
};

export const MOCK_WALLET: WalletSnapshot = {
  user: {
    name: "Amina Mushi",
    creditLimitTzs: 6_000_000,
    creditPoints: 340,
  },
  balance: {
    totalOwedTzs: 2_880_000,
    totalPaidTzs: 2_520_000,
    nextDueTzs: 450_000,
    nextDueDate: "2026-05-05",
  },
  activeOrders: [
    {
      id: "UBE-00412",
      productName: "MacBook Pro 14″ M4",
      image:
        "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=85",
      principalTzs: 5_400_000,
      paidTzs: 2_520_000,
      termMonths: 12,
      monthsPaid: 6,
      nextDueDate: "2026-05-05",
      monthlyTzs: 450_000,
    },
  ],
  recentTransactions: [
    {
      id: "TX-10981",
      kind: "payment",
      amountTzs: 450_000,
      provider: "M-Pesa",
      at: "2026-04-05",
      note: "Installment · UBE-00412",
    },
    {
      id: "TX-10934",
      kind: "topup",
      amountTzs: 200_000,
      provider: "Airtel Money",
      at: "2026-03-28",
      note: "Wallet top-up",
    },
    {
      id: "TX-10902",
      kind: "payment",
      amountTzs: 450_000,
      provider: "Tigo Pesa",
      at: "2026-03-05",
      note: "Installment · UBE-00412",
    },
    {
      id: "TX-10820",
      kind: "deposit",
      amountTzs: 1_080_000,
      provider: "Card",
      at: "2025-11-06",
      note: "Deposit · UBE-00412",
    },
  ],
};
