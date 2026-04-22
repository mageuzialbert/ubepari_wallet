import { requireAdminApi } from "@/lib/auth/admin";
import { csvFilename, csvResponse, toCsv } from "@/lib/export/csv";
import { getReceivablesReport } from "@/lib/reports";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const report = await getReceivablesReport();
  const csv = toCsv(report.rows, [
    { header: "order_reference", value: (r) => r.reference },
    { header: "order_id", value: (r) => r.orderId },
    { header: "user_name", value: (r) => r.userName },
    { header: "user_phone", value: (r) => r.userPhone },
    { header: "balance_tzs", value: (r) => r.balance },
    { header: "unpaid_installments", value: (r) => r.unpaidCount },
    { header: "overdue_installments", value: (r) => r.overdueCount },
    { header: "next_due_date", value: (r) => r.nextDueDate ?? "" },
    { header: "oldest_overdue_date", value: (r) => r.oldestOverdueDueDate ?? "" },
    { header: "oldest_overdue_days", value: (r) => r.oldestOverdueDays },
    { header: "bucket", value: (r) => r.bucket },
  ]);

  return csvResponse(csvFilename("receivables"), csv);
}
