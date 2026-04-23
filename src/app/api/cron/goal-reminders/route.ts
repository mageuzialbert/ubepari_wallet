import { NextResponse, type NextRequest } from "next/server";

import { logEvent } from "@/lib/events";
import { getProductsBySlugs } from "@/lib/products";
import { sendSms } from "@/lib/sms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GoalsRow } from "@/lib/supabase/types";
import { defaultLocale } from "@/i18n/config";
import { formatTzs } from "@/lib/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function advanceOneMonth(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const month = d.getUTCMonth();
  d.setUTCMonth(month + 1);
  if (d.getUTCMonth() !== (month + 1) % 12) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

async function runReminders(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  const admin = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: goals } = await admin
    .from("goals")
    .select("*")
    .eq("status", "active")
    .lte("next_reminder_date", today);

  const list = (goals ?? []) as GoalsRow[];
  if (list.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  const slugs = Array.from(new Set(list.map((g) => g.product_slug)));
  const [{ data: profiles }, productMap] = await Promise.all([
    admin
      .from("profiles")
      .select("id, phone, first_name")
      .in("id", Array.from(new Set(list.map((g) => g.user_id)))),
    getProductsBySlugs(slugs, defaultLocale),
  ]);
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p] as const),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const goal of list) {
    const profile = profileMap.get(goal.user_id);
    if (!profile?.phone) {
      skipped++;
      continue;
    }
    const product = productMap.get(goal.product_slug);
    const productName = product?.name ?? goal.product_slug;
    const amount = formatTzs(goal.monthly_target_tzs, defaultLocale);
    const firstName = profile.first_name ?? "";

    const text =
      `Hujambo ${firstName}, kumbuka lengo lako — weka ${amount} kwa ${productName} mwezi huu. ` +
      `Fungua Ubepari app ili kuweka kiasi. | Hi ${firstName}, save ${amount} toward ${productName} this month.`;

    const result = await sendSms(profile.phone, text);
    if (!result.ok) {
      failed++;
      logEvent("goal.reminder_sms_failed", {
        goalId: goal.id,
        userId: goal.user_id,
        reason: result.reason,
      });
      continue;
    }
    await admin
      .from("goals")
      .update({ next_reminder_date: advanceOneMonth(goal.next_reminder_date ?? today) })
      .eq("id", goal.id);
    sent++;
  }

  logEvent("goal.reminder_batch", { sent, skipped, failed, total: list.length });
  return { sent, skipped, failed };
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (process.env.GOAL_REMINDERS_ENABLED !== "1") {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runReminders();
  return NextResponse.json({ ok: true, ...summary });
}

// Accept both GET (Vercel Cron default) and POST so a human can curl either.
export const GET = handle;
export const POST = handle;
