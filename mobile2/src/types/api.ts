export type KycStatus = "none" | "pending" | "approved" | "rejected";

export type User = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  kycStatus: KycStatus;
  creditLimitTzs: number;
  creditPoints: number;
};

export type UsageTag = "Gaming" | "Design" | "Coding" | "Office" | "Student" | "Creator";

export type Brand =
  | "Apple"
  | "Dell"
  | "HP"
  | "Lenovo"
  | "ASUS"
  | "MSI"
  | "Acer"
  | "Custom";

export type ProductSpecs = {
  cpu: string;
  cpuGeneration: string;
  ram: string;
  storage: string;
  gpu: string;
  display: string;
  os: string;
  weight: string;
};

export type Product = {
  slug: string;
  name: string;
  brand: string;
  tagline: string;
  description: string;
  priceTzs: number;
  stock: number;
  colorAccent: string | null;
  images: string[];
  usageTags: UsageTag[];
  specs: ProductSpecs;
};

export type GoalStatus = "active" | "completed" | "cancelled";
export type GoalTerm = 3 | 6 | 9 | 12;

export type Goal = {
  id: string;
  reference: string;
  productSlug: string;
  productName?: string;
  productImage?: string | null;
  productColorAccent?: string | null;
  productPrice: number;
  targetMonths: GoalTerm;
  monthlyTarget: number;
  contributedTzs: number;
  status: GoalStatus;
  createdAt: string;
  nextReminderDate?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  receiptNumber?: string | null;
  receiptIssuedAt?: string | null;
};

export type PaymentStatus = "pending" | "success" | "failed";
export type MnoProvider = "mpesa" | "tigopesa" | "airtelmoney";

export type Payment = {
  id: string;
  kind: "topup" | "refund" | "contribution" | "deposit" | "installment";
  amount_tzs: number;
  provider: MnoProvider;
  status: PaymentStatus;
  settled_at: string | null;
  evmark_ref: string | null;
};

export type Contribution = {
  id: string;
  amountTzs: number;
  provider: MnoProvider;
  status: PaymentStatus;
  evmarkReferenceId?: string | null;
  createdAt: string;
  settledAt?: string | null;
};

export type WalletBucket = "available" | "allocated";
export type WalletEntryKind = "credit" | "debit";

export type WalletBalance = {
  availableTzs: number;
  allocatedTzs: number;
  totalTzs: number;
};

export type WalletEntry = {
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
