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
  specs: {
    cpu: string;
    cpuGeneration: string;
    ram: string;
    storage: string;
    gpu: string;
    display: string;
    os: string;
    weight: string;
  };
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

export type GoalStatus = "active" | "completed" | "cancelled";
export type GoalTerm = 3 | 6 | 9 | 12;

export type Goal = {
  id: string;
  reference: string;
  productSlug: string;
  productName?: string;
  productPrice: number;
  targetMonths: GoalTerm;
  monthlyTarget: number;
  contributedTzs: number;
  status: GoalStatus;
  createdAt: string;
  nextReminderDate?: string | null;
  receiptNumber?: string | null;
  cancellationReason?: string | null;
};

export type PaymentStatus = "pending" | "success" | "failed";
export type MnoProvider = "mpesa" | "tigopesa" | "airtelmoney";

export type Payment = {
  id: string;
  kind: "topup" | "refund";
  amountTzs: number;
  provider: MnoProvider;
  status: PaymentStatus;
  settledAt: string | null;
  evmarkRef: string | null;
  createdAt: string;
};

export type Contribution = {
  id: string;
  amountTzs: number;
  provider: MnoProvider;
  status: PaymentStatus;
  evmarkReferenceId?: string | null;
  createdAt: string;
};

export type AssistantCardKind = "product" | "goal" | "goalPlan" | "contribution";

export type AssistantCard =
  | { kind: "product"; slug: string; name: string; brand: string; tagline: string; priceTzs: number; image: string }
  | { kind: "goal"; id: string; reference: string; productName: string; status: GoalStatus; contributedTzs: number; priceTzs: number; monthlyTargetTzs: number; nextReminderDate: string | null }
  | { kind: "goalPlan"; priceTzs: number; term: GoalTerm; monthlyTarget: number }
  | { kind: "contribution"; goalId: string; amountTzs: number; status: PaymentStatus; createdAt: string };
