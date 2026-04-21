import { NextResponse, type NextRequest } from "next/server";

import { askLlm } from "@/lib/llm";
import { getProducts } from "@/lib/products";
import { defaultLocale, hasLocale } from "@/i18n/config";

function buildCatalogPrompt(locale: "en" | "sw") {
  return getProducts(locale).map((p) => ({
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    priceTzs: p.priceTzs,
    stock: p.stock,
    tagline: p.tagline,
    usageTags: p.usageTags,
    cpu: p.specs.cpu,
    gpu: p.specs.gpu,
    ram: p.specs.ram,
    display: p.specs.display,
    os: p.specs.os,
  }));
}

const SYSTEM_EN = `You are Ubepari's PC advisor for Tanzanian customers. Ubepari sells new PCs with a hire-purchase plan ("lipa kidogo kidogo") — 20% deposit today, balance over 3/6/9/12 months. All prices are in Tanzanian Shillings (TZS).

Given a user's request, recommend EXACTLY ONE PC from the catalog below that best fits their stated use case, budget, and preferences. If multiple fit, pick the best value. Never invent products — only choose from the catalog.

Respond with a single JSON object of exactly this shape (no other text):
{"productSlug": "<slug from catalog>", "rationale": "<2-3 sentences, warm and specific, explaining why this PC fits>"}`;

const SYSTEM_SW = `Wewe ni mshauri wa PC wa Ubepari kwa wateja wa Tanzania. Ubepari inauza PC mpya kwa mpango wa kukopa ("lipa kidogo kidogo") — malipo ya awali 20% leo, salio kwa miezi 3/6/9/12. Bei zote ni kwa Shilingi ya Tanzania (TZS).

Kwa ombi la mtumiaji, pendekeza PC MMOJA TU kutoka kwenye orodha iliyo hapa chini inayofaa zaidi matumizi, bajeti na upendeleo wao. Ikiwa kadhaa zinafaa, chagua yenye thamani bora. Usibuni bidhaa — chagua tu kutoka kwenye orodha.

Jibu kwa kitu kimoja tu cha JSON chenye umbo hili (bila maneno mengine):
{"productSlug": "<slug kutoka orodha>", "rationale": "<sentensi 2-3, joto na mahususi, ukieleza kwa nini PC hii inafaa>"}`;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { prompt?: unknown } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 10) {
    return NextResponse.json({ error: "too_short" }, { status: 400 });
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  const locale = cookie && hasLocale(cookie) ? cookie : defaultLocale;

  const catalog = buildCatalogPrompt(locale);
  const system = `${locale === "sw" ? SYSTEM_SW : SYSTEM_EN}\n\nCatalog:\n${JSON.stringify(catalog, null, 0)}`;

  const result = await askLlm({ system, user: prompt, jsonOutput: true, maxTokens: 500 });
  if (!result.ok) {
    console.error("[recommend] llm failed", result.reason);
    return NextResponse.json({ error: "llm_failed", detail: result.reason }, { status: 502 });
  }

  let parsed: { productSlug?: unknown; rationale?: unknown };
  try {
    parsed = JSON.parse(result.content);
  } catch {
    return NextResponse.json({ error: "llm_invalid_response" }, { status: 502 });
  }

  const slug = typeof parsed.productSlug === "string" ? parsed.productSlug : "";
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale : "";
  const product = catalog.find((p) => p.slug === slug);
  if (!product || !rationale) {
    return NextResponse.json({ error: "llm_invalid_response" }, { status: 502 });
  }

  return NextResponse.json({
    productSlug: product.slug,
    productName: product.name,
    priceTzs: product.priceTzs,
    rationale,
  });
}
