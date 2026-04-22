import type { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { csvFilename, csvResponse, toCsv } from "@/lib/export/csv";
import { getRevenueReport } from "@/lib/reports";
import {
  parseRangeKey,
  resolveRange,
} from "@/lib/reports-range";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rangeKey = parseRangeKey(req.nextUrl.searchParams.get("range"));
  const range = resolveRange(rangeKey);
  const report = await getRevenueReport(range);

  const csv = toCsv(report.daily, [
    { header: "date", value: (r) => r.dateKey },
    { header: "deposit_tzs", value: (r) => r.deposit },
    { header: "installment_tzs", value: (r) => r.installment },
    { header: "topup_tzs", value: (r) => r.topup },
    { header: "total_tzs", value: (r) => r.total },
  ]);

  return csvResponse(csvFilename("revenue", new Date(), rangeKey), csv);
}
