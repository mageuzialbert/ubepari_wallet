import { requireAdminApi } from "@/lib/auth/admin";
import { csvFilename, csvResponse, toCsv } from "@/lib/export/csv";
import { getInventoryReport } from "@/lib/reports";
import { defaultLocale, hasLocale } from "@/i18n/config";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rawLocale = req.nextUrl.searchParams.get("locale") ?? "";
  const locale = hasLocale(rawLocale) ? rawLocale : defaultLocale;

  const report = await getInventoryReport(locale);
  const csv = toCsv(report.rows, [
    { header: "slug", value: (r) => r.slug },
    { header: "name", value: (r) => r.name },
    { header: "brand", value: (r) => r.brand },
    { header: "cash_price_tzs", value: (r) => r.cashPriceTzs },
    { header: "stock", value: (r) => r.stock },
    { header: "featured", value: (r) => (r.featured ? "true" : "false") },
    {
      header: "status",
      value: (r) =>
        r.outOfStock ? "out_of_stock" : r.lowStock ? "low_stock" : "ok",
    },
  ]);

  return csvResponse(csvFilename("inventory"), csv);
}
