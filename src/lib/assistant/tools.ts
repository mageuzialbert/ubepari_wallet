import "server-only";

import type { AssistantCallContext } from "@/lib/assistant/context";
import type { LlmToolDecl } from "@/lib/llm";
import {
  getProducts,
  getProduct,
  type Product,
} from "@/lib/products";
import {
  getWalletSnapshot,
  getOrdersSnapshot,
  getOrderDetail,
  getPaymentsHistory,
} from "@/lib/wallet-data";
import { computeCreditPlan, CREDIT_TERMS, type CreditTerm } from "@/lib/credit";

export type CardPayload =
  | {
      kind: "product";
      slug: string;
      name: string;
      brand: string;
      tagline: string;
      priceTzs: number;
      image: string | null;
    }
  | {
      kind: "order";
      id: string;
      reference: string;
      productName: string;
      status: string;
      monthsPaid: number;
      termMonths: number;
      monthlyTzs: number;
      nextDueDate: string | null;
    }
  | {
      kind: "installment";
      orderId: string;
      sequence: number;
      dueDate: string;
      amountTzs: number;
      paid: boolean;
    }
  | {
      kind: "plan";
      priceTzs: number;
      term: number;
      deposit: number;
      monthly: number;
      totalPayable: number;
      apr: number;
    };

export type ToolResult = {
  toModel: Record<string, unknown>;
  cards?: CardPayload[];
};

export type ToolDef = {
  name: string;
  auth: "public" | "required";
  schema: LlmToolDecl;
  execute: (args: unknown, ctx: AssistantCallContext) => Promise<ToolResult>;
};

const AUTH_REQUIRED: ToolResult = {
  toModel: {
    error: "auth_required",
    message:
      "This requires the user to be signed in. Tell them to sign in to see personal information like their orders, wallet balance, or payment history.",
  },
};

function asObject(args: unknown): Record<string, unknown> {
  if (args && typeof args === "object") return args as Record<string, unknown>;
  return {};
}

function productToCard(p: Product): CardPayload {
  return {
    kind: "product",
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    tagline: p.tagline,
    priceTzs: p.priceTzs,
    image: p.images[0] ?? null,
  };
}

function compactProduct(p: Product): Record<string, unknown> {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    priceTzs: p.priceTzs,
    tagline: p.tagline,
    stock: p.stock,
    usageTags: p.usageTags,
    cpu: p.specs.cpu,
    gpu: p.specs.gpu,
    ram: p.specs.ram,
    display: p.specs.display,
    os: p.specs.os,
  };
}

// --- Tool registry -----------------------------------------------------------

const listProducts: ToolDef = {
  name: "list_products",
  auth: "public",
  schema: {
    type: "function",
    function: {
      name: "list_products",
      description:
        "Search the Ubepari catalog for PCs. Use this whenever the user asks what to buy, for recommendations, or about the catalog. Optional filters narrow the list.",
      parameters: {
        type: "object",
        properties: {
          maxPriceTzs: {
            type: "integer",
            description: "Maximum cash price in TZS (integer, no decimals).",
          },
          useCase: {
            type: "string",
            description:
              "A use case like 'gaming', 'coding', 'design', 'office', 'student', 'creator'.",
          },
          brand: {
            type: "string",
            description: "Brand filter, e.g. 'Apple', 'Dell', 'HP', 'Lenovo'.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    const a = asObject(args);
    const maxPrice =
      typeof a.maxPriceTzs === "number" ? a.maxPriceTzs : undefined;
    const useCase =
      typeof a.useCase === "string" ? a.useCase.toLowerCase() : undefined;
    const brand =
      typeof a.brand === "string" ? a.brand.toLowerCase() : undefined;

    const all = await getProducts(ctx.locale);
    const filtered = all.filter((p) => {
      if (maxPrice !== undefined && p.priceTzs > maxPrice) return false;
      if (brand && p.brand.toLowerCase() !== brand) return false;
      if (useCase) {
        const tags = p.usageTags.map((t) => t.toLowerCase());
        if (!tags.some((t) => t.includes(useCase) || useCase.includes(t))) {
          return false;
        }
      }
      return true;
    });
    const top = filtered.sort((a, b) => a.priceTzs - b.priceTzs).slice(0, 8);
    return {
      toModel: {
        count: top.length,
        products: top.map(compactProduct),
      },
      cards: top.slice(0, 4).map(productToCard),
    };
  },
};

const getProductTool: ToolDef = {
  name: "get_product",
  auth: "public",
  schema: {
    type: "function",
    function: {
      name: "get_product",
      description:
        "Fetch full specs for a product by slug. Use this when the user names a specific PC or asks for deeper details after a list_products result.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Product slug." },
        },
        required: ["slug"],
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    const a = asObject(args);
    const slug = typeof a.slug === "string" ? a.slug : "";
    if (!slug) {
      return { toModel: { error: "missing_slug" } };
    }
    const product = await getProduct(slug, ctx.locale);
    if (!product) {
      return { toModel: { error: "not_found", slug } };
    }
    return {
      toModel: {
        product: {
          ...compactProduct(product),
          description: product.description,
          storage: product.specs.storage,
          weight: product.specs.weight,
          cpuGeneration: product.specs.cpuGeneration,
        },
      },
      cards: [productToCard(product)],
    };
  },
};

const computePlanTool: ToolDef = {
  name: "compute_credit_plan",
  auth: "public",
  schema: {
    type: "function",
    function: {
      name: "compute_credit_plan",
      description:
        "Compute the hire-purchase breakdown (deposit, monthly, total) for a given TZS price and term in months.",
      parameters: {
        type: "object",
        properties: {
          priceTzs: {
            type: "integer",
            description: "Cash price in TZS.",
          },
          term: {
            type: "integer",
            enum: [3, 6, 9, 12],
            description: "Term in months.",
          },
        },
        required: ["priceTzs", "term"],
        additionalProperties: false,
      },
    },
  },
  execute: async (args) => {
    const a = asObject(args);
    const priceTzs = typeof a.priceTzs === "number" ? a.priceTzs : 0;
    const term = typeof a.term === "number" ? a.term : 0;
    if (priceTzs <= 0 || !CREDIT_TERMS.includes(term as CreditTerm)) {
      return { toModel: { error: "invalid_args" } };
    }
    const plan = computeCreditPlan(priceTzs, term as CreditTerm);
    return {
      toModel: { plan },
      cards: [
        {
          kind: "plan",
          priceTzs: plan.price,
          term: plan.term,
          deposit: plan.deposit,
          monthly: plan.monthly,
          totalPayable: plan.totalPayable,
          apr: plan.apr,
        },
      ],
    };
  },
};

type ExplainTopic =
  | "hire_purchase"
  | "kyc"
  | "deposit"
  | "refund"
  | "installment";

const TOPIC_COPY: Record<ExplainTopic, { en: string; sw: string }> = {
  hire_purchase: {
    en: "Ubepari hire-purchase (lipa kidogo kidogo): 20% deposit today, balance over 3, 6, 9, or 12 months. Service fee scales by term — 0%/5%/8%/12% respectively. Monthly payment rounded up to the nearest 1,000 TZS.",
    sw: "Lipa kidogo kidogo cha Ubepari: amana 20% leo, salio kwa miezi 3, 6, 9, au 12. Ada inabadilika kwa kipindi — 0%/5%/8%/12%. Malipo ya mwezi yanapangwa juu hadi shilingi 1,000 za karibu.",
  },
  kyc: {
    en: "KYC requires a valid NIDA number and an ID document photo. Our team reviews approvals within a business day; rejected submissions can be resubmitted with notes from the admin.",
    sw: "KYC inahitaji namba sahihi ya NIDA na picha ya hati ya utambulisho. Timu yetu inakagua ndani ya siku moja ya kazi; iliyokataliwa inaweza kutumwa tena ikiwa na maelezo.",
  },
  deposit: {
    en: "The 20% deposit is pushed via mobile money (M-Pesa, Tigo Pesa, Airtel Money) when you reserve a PC. Once the callback settles, your order activates and the installment schedule starts.",
    sw: "Amana ya 20% inalipwa kupitia simu (M-Pesa, Tigo Pesa, Airtel Money) unapohifadhi PC. Malipo yanapothibitishwa, oda inawasha na ratiba ya awamu inaanza.",
  },
  refund: {
    en: "Refunds are issued by admin as a wallet credit. You can use the wallet balance for installments or request a cash-out via support.",
    sw: "Marejesho yanatolewa na admin kama credit ya wallet. Unaweza kutumia kiasi hicho kwa awamu au kuomba kutoa fedha kupitia msaada.",
  },
  installment: {
    en: "Installments are fixed monthly amounts. You can pay them from your wallet balance or push directly from mobile money on the due date.",
    sw: "Awamu ni kiasi cha kila mwezi kisichobadilika. Unaweza kulipa kutoka wallet yako au kutuma moja kwa moja kutoka mobile money siku ya malipo.",
  },
};

const explainTopicTool: ToolDef = {
  name: "explain_topic",
  auth: "public",
  schema: {
    type: "function",
    function: {
      name: "explain_topic",
      description:
        "Get a short canonical explanation of an Ubepari concept in the user's locale.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["hire_purchase", "kyc", "deposit", "refund", "installment"],
          },
        },
        required: ["topic"],
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    const a = asObject(args);
    const topic = a.topic as ExplainTopic | undefined;
    if (!topic || !(topic in TOPIC_COPY)) {
      return { toModel: { error: "unknown_topic" } };
    }
    return {
      toModel: {
        topic,
        explanation: TOPIC_COPY[topic][ctx.locale],
      },
    };
  },
};

const getMyWalletTool: ToolDef = {
  name: "get_my_wallet",
  auth: "required",
  schema: {
    type: "function",
    function: {
      name: "get_my_wallet",
      description:
        "Read the signed-in user's wallet balance, next installment due, active order count, and KYC status. Use this when the user asks about their balance, next installment, or how much they owe.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  execute: async (_args, ctx) => {
    if (!ctx.supabase || !ctx.userId) return AUTH_REQUIRED;
    const snap = await getWalletSnapshot(ctx.supabase, ctx.userId, ctx.locale);
    if (!snap) return { toModel: { error: "not_found" } };
    return {
      toModel: {
        firstName: snap.profile.firstName,
        kycStatus: snap.profile.kycStatus,
        balanceTzs: snap.balance.balanceTzs,
        totalOwedTzs: snap.balance.totalOwedTzs,
        totalPaidTzs: snap.balance.totalPaidTzs,
        nextDueTzs: snap.balance.nextDueTzs,
        nextDueDate: snap.balance.nextDueDate,
        activeOrderCount: snap.activeOrders.length,
      },
    };
  },
};

const getMyOrdersTool: ToolDef = {
  name: "get_my_orders",
  auth: "required",
  schema: {
    type: "function",
    function: {
      name: "get_my_orders",
      description:
        "List all of the signed-in user's orders with progress and next due date. Use this when the user asks to see their orders or PCs.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  execute: async (_args, ctx) => {
    if (!ctx.supabase || !ctx.userId) return AUTH_REQUIRED;
    const snap = await getOrdersSnapshot(ctx.supabase, ctx.userId, ctx.locale);
    const summaries = snap.orders.map((o) => ({
      id: o.id,
      reference: o.reference,
      productName: o.productName,
      status: o.status,
      monthsPaid: o.monthsPaid,
      termMonths: o.termMonths,
      monthlyTzs: o.monthlyTzs,
      principalTzs: o.principalTzs,
      paidTzs: o.paidTzs,
      createdAt: o.createdAt,
    }));
    const cards: CardPayload[] = snap.orders.slice(0, 4).map((o) => ({
      kind: "order",
      id: o.id,
      reference: o.reference,
      productName: o.productName,
      status: o.status,
      monthsPaid: o.monthsPaid,
      termMonths: o.termMonths,
      monthlyTzs: o.monthlyTzs,
      nextDueDate:
        o.installments.find((i) => i.paidAt === null)?.dueDate ?? null,
    }));
    return {
      toModel: { count: summaries.length, orders: summaries },
      cards,
    };
  },
};

const getOrderDetailTool: ToolDef = {
  name: "get_order_detail",
  auth: "required",
  schema: {
    type: "function",
    function: {
      name: "get_order_detail",
      description:
        "Fetch the full installment schedule and payment history for one of the user's orders, by order id.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
        },
        required: ["orderId"],
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    if (!ctx.supabase || !ctx.userId) return AUTH_REQUIRED;
    const a = asObject(args);
    const orderId = typeof a.orderId === "string" ? a.orderId : "";
    if (!orderId) return { toModel: { error: "missing_order_id" } };
    const detail = await getOrderDetail(
      ctx.supabase,
      ctx.userId,
      orderId,
      ctx.locale,
    );
    if (!detail) return { toModel: { error: "not_found" } };
    const unpaid = detail.installments.filter((i) => i.paidAt === null);
    const cards: CardPayload[] = unpaid.slice(0, 3).map((i) => ({
      kind: "installment",
      orderId: detail.id,
      sequence: i.sequence,
      dueDate: i.dueDate,
      amountTzs: i.amountTzs,
      paid: false,
    }));
    return {
      toModel: {
        id: detail.id,
        reference: detail.reference,
        status: detail.status,
        productName: detail.product.name,
        termMonths: detail.termMonths,
        monthlyTzs: detail.monthlyTzs,
        totalTzs: detail.totalTzs,
        depositTzs: detail.depositTzs,
        installments: detail.installments,
      },
      cards,
    };
  },
};

const getMyPaymentsTool: ToolDef = {
  name: "get_my_payments",
  auth: "required",
  schema: {
    type: "function",
    function: {
      name: "get_my_payments",
      description:
        "Fetch the signed-in user's recent payments (deposits, installments, top-ups, refunds).",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "deposit", "installment", "topup", "refund"],
          },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    if (!ctx.supabase || !ctx.userId) return AUTH_REQUIRED;
    const a = asObject(args);
    const filter = (typeof a.filter === "string" ? a.filter : "all") as
      | "all"
      | "deposit"
      | "installment"
      | "topup"
      | "refund";
    const limit =
      typeof a.limit === "number" ? Math.min(50, Math.max(1, a.limit)) : 15;
    const payments = await getPaymentsHistory(
      ctx.supabase,
      ctx.userId,
      ctx.locale,
      filter,
      limit,
    );
    return {
      toModel: { count: payments.length, payments },
    };
  },
};

const REGISTRY: ToolDef[] = [
  listProducts,
  getProductTool,
  computePlanTool,
  explainTopicTool,
  getMyWalletTool,
  getMyOrdersTool,
  getOrderDetailTool,
  getMyPaymentsTool,
];

const BY_NAME = new Map(REGISTRY.map((t) => [t.name, t]));

export function assistantToolSchemas(): LlmToolDecl[] {
  return REGISTRY.map((t) => t.schema);
}

export async function executeAssistantTool(
  name: string,
  rawArgs: string,
  ctx: AssistantCallContext,
): Promise<ToolResult> {
  const tool = BY_NAME.get(name);
  if (!tool) {
    return { toModel: { error: "unknown_tool", name } };
  }
  if (tool.auth === "required" && ctx.user.authState !== "signed_in") {
    return AUTH_REQUIRED;
  }
  let parsed: unknown = {};
  if (rawArgs && rawArgs.trim().length > 0) {
    try {
      parsed = JSON.parse(rawArgs);
    } catch {
      return { toModel: { error: "invalid_args" } };
    }
  }
  try {
    return await tool.execute(parsed, ctx);
  } catch (err) {
    return {
      toModel: {
        error: "tool_failed",
        reason: String(err instanceof Error ? err.message : err),
      },
    };
  }
}
