import { NextResponse } from "next/server";

import { buildReceiptPdfBuffer, loadReceiptData } from "@/lib/receipts";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const data = await loadReceiptData(session.claims.userId, id);
  if (!data.ok) {
    return NextResponse.json({ error: data.error }, { status: 404 });
  }

  const pdf = await buildReceiptPdfBuffer({
    goal: data.goal,
    customerName: data.customerName,
    phone: data.phone,
    productName: data.productName,
    contributions: data.contributions,
  });

  const filename = data.goal.receipt_number
    ? `UBE-${data.goal.receipt_number}.pdf`
    : `goal-${data.goal.id}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
