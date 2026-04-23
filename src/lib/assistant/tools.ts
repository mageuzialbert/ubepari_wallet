import "server-only";

import type { AssistantCallContext } from "@/lib/assistant/context";
import type { LlmToolDecl } from "@/lib/llm";
import {
  computeMonthlyTarget,
  GOAL_TERMS,
  type GoalTerm,
} from "@/lib/goal";
import {
  getGoalDetail,
  listGoalsForUser,
} from "@/lib/goals";
import {
  getProducts,
  getProduct,
  getProductsBySlugs,
  type Product,
} from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
      kind: "goal";
      id: string;
      reference: string;
      productName: string;
      status: string;
      contributedTzs: number;
      priceTzs: number;
      monthlyTargetTzs: number;
      nextReminderDate: string | null;
    }
  | {
      kind: "goalPlan";
      priceTzs: number;
      term: number;
      monthlyTarget: number;
    }
  | {
      kind: "contribution";
      goalId: string;
      amountTzs: number;
      status: string;
      createdAt: string;
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
      "This requires the user to be signed in. Tell them to sign in to see their goals, contributions, or account state.",
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

const computeGoalPlanTool: ToolDef = {
  name: "compute_goal_plan",
  auth: "public",
  schema: {
    type: "function",
    function: {
      name: "compute_goal_plan",
      description:
        "Compute the monthly savings target for a given TZS price and term in months. No interest, no deposit — just price ÷ term rounded up to the nearest 1,000 TZS.",
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
            description: "Term in months (3, 6, 9, or 12).",
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
    if (priceTzs <= 0 || !GOAL_TERMS.includes(term as GoalTerm)) {
      return { toModel: { error: "invalid_args" } };
    }
    const monthlyTarget = computeMonthlyTarget(priceTzs, term as GoalTerm);
    return {
      toModel: {
        plan: { priceTzs, term, monthlyTarget },
      },
      cards: [
        {
          kind: "goalPlan",
          priceTzs,
          term,
          monthlyTarget,
        },
      ],
    };
  },
};

type ExplainTopic = "layaway" | "kyc" | "reminder" | "receipt" | "refund";

const TOPIC_COPY: Record<ExplainTopic, { en: string; sw: string }> = {
  layaway: {
    en: "Ubepari is a layaway service (lipa kidogo kidogo): pick a PC, choose a 3/6/9/12-month guideline, and save toward it any amount any time via M-Pesa, Tigo Pesa, or Airtel Money. No interest, no debt, no deposit required. When your total hits the target price, you download a receipt and pick up the PC at our Magomeni Mapipa showroom.",
    sw: "Ubepari ni huduma ya lipa kidogo kidogo: chagua PC, chagua mwongozo wa miezi 3/6/9/12, kisha weka akiba kwa kiasi chochote muda wowote kupitia M-Pesa, Tigo Pesa, au Airtel Money. Bila riba, bila deni, bila malipo ya awali. Ukifikia bei lengwa, pakua risiti na uchukue PC dukani Magomeni Mapipa.",
  },
  kyc: {
    en: "KYC requires a valid NIDA number and an ID document photo. Our team reviews approvals within a business day; rejected submissions can be resubmitted with notes from the admin.",
    sw: "KYC inahitaji namba sahihi ya NIDA na picha ya hati ya utambulisho. Timu yetu inakagua ndani ya siku moja ya kazi; iliyokataliwa inaweza kutumwa tena ikiwa na maelezo.",
  },
  reminder: {
    en: "Once a month, we'll text you a reminder of your monthly savings target. It's a nudge, not a debt — you can contribute more, less, or skip a month.",
    sw: "Mara moja kwa mwezi, tutakutumia ukumbusho wa lengo lako la mwezi. Si deni — unaweza kuweka zaidi, chini, au kuruka mwezi.",
  },
  receipt: {
    en: "When your goal completes (total saved ≥ product price), you can download a PDF receipt from the goal page. Bring it with a valid ID to our Magomeni Mapipa showroom to collect your PC.",
    sw: "Lengo lako likikamilika (jumla umeweka ≥ bei), pakua risiti kutoka ukurasa wa lengo. Ilete pamoja na kitambulisho halali dukani Magomeni Mapipa kuchukua PC.",
  },
  refund: {
    en: "If you cancel a goal, your contributions are held. Email support@ubeparipc.com and we'll process the refund manually. There's no automatic MNO reversal.",
    sw: "Ukighairi lengo, kiasi ulichochangia kitahifadhiwa. Tuma barua pepe support@ubeparipc.com tutafanya marejesho kwa mikono. Hakuna urejesho wa kiotomatiki.",
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
            enum: ["layaway", "kyc", "reminder", "receipt", "refund"],
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

const getMyGoalsTool: ToolDef = {
  name: "get_my_goals",
  auth: "required",
  schema: {
    type: "function",
    function: {
      name: "get_my_goals",
      description:
        "List all of the signed-in user's savings goals with progress. Use this when the user asks to see their goals, savings, or how much they've saved.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  execute: async (_args, ctx) => {
    if (!ctx.userId) return AUTH_REQUIRED;
    const goals = await listGoalsForUser(ctx.userId);
    const productMap = await getProductsBySlugs(
      Array.from(new Set(goals.map((g) => g.product_slug))),
      ctx.locale,
    );
    const summaries = goals.map((g) => ({
      id: g.id,
      reference: g.reference,
      productName: productMap.get(g.product_slug)?.name ?? g.product_slug,
      status: g.status,
      priceTzs: g.product_price_tzs,
      contributedTzs: g.contributed_tzs,
      monthlyTargetTzs: g.monthly_target_tzs,
      targetMonths: g.target_months,
      nextReminderDate: g.next_reminder_date,
      createdAt: g.created_at,
    }));
    const cards: CardPayload[] = goals.slice(0, 4).map((g) => ({
      kind: "goal",
      id: g.id,
      reference: g.reference,
      productName: productMap.get(g.product_slug)?.name ?? g.product_slug,
      status: g.status,
      contributedTzs: g.contributed_tzs,
      priceTzs: g.product_price_tzs,
      monthlyTargetTzs: g.monthly_target_tzs,
      nextReminderDate: g.next_reminder_date,
    }));
    return {
      toModel: { count: summaries.length, goals: summaries },
      cards,
    };
  },
};

const getGoalDetailTool: ToolDef = {
  name: "get_goal_detail",
  auth: "required",
  schema: {
    type: "function",
    function: {
      name: "get_goal_detail",
      description:
        "Fetch the full contribution history for one of the user's goals, by goal id.",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string" },
        },
        required: ["goalId"],
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    if (!ctx.userId) return AUTH_REQUIRED;
    const a = asObject(args);
    const goalId = typeof a.goalId === "string" ? a.goalId : "";
    if (!goalId) return { toModel: { error: "missing_goal_id" } };
    const detail = await getGoalDetail(ctx.userId, goalId);
    if (!detail) return { toModel: { error: "not_found" } };
    const product = await getProduct(detail.goal.product_slug, ctx.locale);
    const productName = product?.name ?? detail.goal.product_slug;
    return {
      toModel: {
        id: detail.goal.id,
        reference: detail.goal.reference,
        status: detail.goal.status,
        productName,
        priceTzs: detail.goal.product_price_tzs,
        contributedTzs: detail.goal.contributed_tzs,
        monthlyTargetTzs: detail.goal.monthly_target_tzs,
        targetMonths: detail.goal.target_months,
        nextReminderDate: detail.goal.next_reminder_date,
        receiptNumber: detail.goal.receipt_number,
        contributions: detail.contributions,
      },
      cards: [
        {
          kind: "goal",
          id: detail.goal.id,
          reference: detail.goal.reference,
          productName,
          status: detail.goal.status,
          contributedTzs: detail.goal.contributed_tzs,
          priceTzs: detail.goal.product_price_tzs,
          monthlyTargetTzs: detail.goal.monthly_target_tzs,
          nextReminderDate: detail.goal.next_reminder_date,
        },
      ],
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
        "Fetch the signed-in user's recent payments — contributions to savings goals, and any refunds.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        additionalProperties: false,
      },
    },
  },
  execute: async (args, ctx) => {
    if (!ctx.userId) return AUTH_REQUIRED;
    const a = asObject(args);
    const limit =
      typeof a.limit === "number" ? Math.min(50, Math.max(1, a.limit)) : 15;
    const admin = supabaseAdmin();
    const { data: rows } = await admin
      .from("payments")
      .select("id, goal_id, amount_tzs, provider, status, created_at, settled_at, kind")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    const payments = (rows ?? []).map((r) => ({
      id: r.id,
      goalId: r.goal_id,
      amountTzs: r.amount_tzs,
      provider: r.provider,
      status: r.status,
      kind: r.kind,
      createdAt: r.created_at,
      settledAt: r.settled_at,
    }));
    return { toModel: { count: payments.length, payments } };
  },
};

const REGISTRY: ToolDef[] = [
  listProducts,
  getProductTool,
  computeGoalPlanTool,
  explainTopicTool,
  getMyGoalsTool,
  getGoalDetailTool,
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
