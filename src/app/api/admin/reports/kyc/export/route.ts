import type { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { csvFilename, csvResponse, toCsv } from "@/lib/export/csv";
import { getKycReport } from "@/lib/reports";
import { parseRangeKey, resolveRange } from "@/lib/reports-range";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rangeKey = parseRangeKey(req.nextUrl.searchParams.get("range"));
  const range = resolveRange(rangeKey);
  const report = await getKycReport(range);

  const csv = toCsv(report.weeks, [
    { header: "week_start", value: (r) => r.weekStart },
    { header: "submitted", value: (r) => r.submitted },
    { header: "approved", value: (r) => r.approved },
    { header: "rejected", value: (r) => r.rejected },
    { header: "pending", value: (r) => r.pending },
  ]);

  return csvResponse(csvFilename("kyc", new Date(), rangeKey), csv);
}
