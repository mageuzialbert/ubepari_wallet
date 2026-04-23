import "server-only";

import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import { formatTzs } from "@/lib/currency";
import { maskPhone } from "@/lib/phone";
import { getProduct } from "@/lib/products";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GoalsRow, PaymentsRow } from "@/lib/supabase/types";
import { defaultLocale } from "@/i18n/config";

const SHOWROOM_FALLBACK = "Ubepari PC, Magomeni Mapipa, Dar es Salaam";

function formatDateEat(iso: string): string {
  const d = new Date(iso);
  const eat = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const yyyy = eat.getUTCFullYear();
  const mm = String(eat.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(eat.getUTCDate()).padStart(2, "0");
  const hh = String(eat.getUTCHours()).padStart(2, "0");
  const mi = String(eat.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} EAT`;
}

type BuildInput = {
  goal: GoalsRow;
  customerName: string;
  phone: string | null;
  productName: string;
  contributions: Pick<
    PaymentsRow,
    "amount_tzs" | "evmark_reference_id" | "created_at"
  >[];
};

export async function buildReceiptPdfBuffer(input: BuildInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 56 });
  const chunks: Buffer[] = [];

  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const { goal, customerName, phone, productName, contributions } = input;

  const siteUrl = process.env.SITE_URL ?? "https://www.ubeparipc.co.tz";
  const showroom = process.env.SHOWROOM_ADDRESS ?? SHOWROOM_FALLBACK;
  const verifyUrl = goal.receipt_number
    ? `${siteUrl}/admin/goals/verify/${encodeURIComponent(goal.receipt_number)}`
    : siteUrl;

  // Header
  doc
    .fontSize(22)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .text("Ubepari Wallet", { align: "left" });
  doc
    .moveDown(0.1)
    .fontSize(11)
    .font("Helvetica")
    .fillColor("#555")
    .text("Collection Receipt · Risiti ya Kuchukua");
  doc.moveDown(1.5);

  // Receipt meta (left column) + QR code (right)
  const metaTop = doc.y;
  doc
    .fontSize(10)
    .fillColor("#777")
    .text("RECEIPT #", 56, metaTop);
  doc
    .fontSize(14)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .text(goal.receipt_number ?? "—", 56, metaTop + 12);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#777")
    .text("ISSUED", 56, metaTop + 40);
  doc
    .fontSize(11)
    .fillColor("#111")
    .text(
      goal.receipt_issued_at ? formatDateEat(goal.receipt_issued_at) : "—",
      56,
      metaTop + 52,
    );

  // QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 0,
      errorCorrectionLevel: "M",
    });
    const base64 = qrDataUrl.split(",")[1] ?? "";
    const qrBuffer = Buffer.from(base64, "base64");
    doc.image(qrBuffer, 440, metaTop, { width: 96, height: 96 });
  } catch {
    // non-fatal — receipt still readable without QR
  }

  doc.moveDown(5);
  const afterHeader = 200;
  doc.y = afterHeader;

  // Customer + product block
  const blockTop = doc.y;
  doc
    .fontSize(9)
    .fillColor("#777")
    .font("Helvetica")
    .text("CUSTOMER", 56, blockTop);
  doc
    .fontSize(12)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .text(customerName, 56, blockTop + 12);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#555")
    .text(phone ? maskPhone(phone) : "—", 56, blockTop + 30);

  doc
    .fontSize(9)
    .fillColor("#777")
    .text("PRODUCT", 296, blockTop);
  doc
    .fontSize(12)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .text(productName, 296, blockTop + 12, { width: 230 });
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#555")
    .text(`Slug: ${goal.product_slug}`, 296, blockTop + 30);

  doc.y = blockTop + 70;
  doc
    .strokeColor("#ddd")
    .lineWidth(0.6)
    .moveTo(56, doc.y)
    .lineTo(539, doc.y)
    .stroke();
  doc.moveDown(0.8);

  // Contributions table
  doc
    .fontSize(11)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .text("Contributions · Michango");
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc
    .fontSize(9)
    .fillColor("#777")
    .font("Helvetica-Bold")
    .text("DATE", 56, tableTop)
    .text("REFERENCE", 200, tableTop)
    .text("AMOUNT", 420, tableTop, { width: 119, align: "right" });

  doc
    .strokeColor("#eee")
    .lineWidth(0.6)
    .moveTo(56, tableTop + 14)
    .lineTo(539, tableTop + 14)
    .stroke();

  doc.font("Helvetica").fillColor("#111").fontSize(10);
  let rowY = tableTop + 22;
  for (const c of contributions) {
    doc.text(formatDateEat(c.created_at), 56, rowY, { width: 140 });
    doc.text(c.evmark_reference_id ?? "—", 200, rowY, { width: 210 });
    doc.text(formatTzs(c.amount_tzs, defaultLocale), 420, rowY, {
      width: 119,
      align: "right",
    });
    rowY += 18;
  }

  doc
    .strokeColor("#ddd")
    .lineWidth(0.6)
    .moveTo(56, rowY + 4)
    .lineTo(539, rowY + 4)
    .stroke();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111");
  doc.text("TOTAL", 56, rowY + 14);
  doc.text(formatTzs(goal.contributed_tzs, defaultLocale), 420, rowY + 14, {
    width: 119,
    align: "right",
  });

  // Pickup block
  doc.y = rowY + 60;
  doc
    .fontSize(10)
    .fillColor("#555")
    .font("Helvetica")
    .text("Pick up at our showroom:", 56, doc.y);
  doc
    .fontSize(12)
    .fillColor("#111")
    .font("Helvetica-Bold")
    .text(showroom, 56, doc.y + 2, { continued: false });

  // Footer note
  doc.fontSize(9).fillColor("#888").font("Helvetica");
  doc.text(
    "Bring this receipt and a valid ID. Risiti hii pamoja na kitambulisho chako ni lazima wakati wa kuchukua PC. " +
      "Goal reference: " +
      goal.reference,
    56,
    760,
    { width: 483 },
  );

  doc.end();
  return done;
}

export type ReceiptLoad =
  | { ok: true; goal: GoalsRow; customerName: string; phone: string | null; productName: string; contributions: BuildInput["contributions"] }
  | { ok: false; error: "not_found" | "not_completed" };

// Loads all data needed to render a receipt. Used by the PDF route + by any
// future admin-facing verify surface.
export async function loadReceiptData(
  userId: string | null,
  goalId: string,
  { asAdmin = false }: { asAdmin?: boolean } = {},
): Promise<ReceiptLoad> {
  const admin = supabaseAdmin();
  let query = admin.from("goals").select("*").eq("id", goalId);
  if (!asAdmin && userId) query = query.eq("user_id", userId);
  const { data: goal } = await query.maybeSingle();
  if (!goal) return { ok: false, error: "not_found" };
  if (goal.status !== "completed") return { ok: false, error: "not_completed" };

  const [{ data: profile }, { data: kyc }, product, { data: contributions }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", goal.user_id)
        .maybeSingle(),
      admin
        .from("kyc_submissions")
        .select("legal_first_name, legal_last_name")
        .eq("user_id", goal.user_id)
        .eq("status", "approved")
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getProduct(goal.product_slug, defaultLocale),
      admin
        .from("payments")
        .select("amount_tzs, evmark_reference_id, created_at")
        .eq("goal_id", goal.id)
        .eq("status", "success")
        .order("created_at", { ascending: true }),
    ]);

  const customerName =
    kyc && kyc.legal_first_name
      ? `${kyc.legal_first_name} ${kyc.legal_last_name}`.trim()
      : [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer";

  return {
    ok: true,
    goal: goal as GoalsRow,
    customerName,
    phone: profile?.phone ?? null,
    productName: product?.name ?? goal.product_slug,
    contributions: (contributions ?? []) as BuildInput["contributions"],
  };
}
