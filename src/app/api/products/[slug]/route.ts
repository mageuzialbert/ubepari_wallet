import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale } from "@/i18n/config";
import { getProduct } from "@/lib/products";

export const revalidate = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale") ?? "";
  const locale = hasLocale(localeParam) ? localeParam : defaultLocale;
  const { slug } = await params;

  const product = await getProduct(slug, locale);
  if (!product) return NextResponse.json({ product: null }, { status: 404 });
  return NextResponse.json({ product });
}
