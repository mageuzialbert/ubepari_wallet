import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { supabaseForUser } from "@/lib/supabase/server";
import { getSession, getSessionFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getWalletBalance } from "@/lib/wallet";
import type { Locale } from "@/i18n/config";

export type AssistantGoalSummary = {
  reference: string;
  productName: string;
  priceTzs: number;
  contributedTzs: number;
  monthlyTargetTzs: number;
  nextReminderDate: string | null;
};

export type AssistantUserContext =
  | { authState: "anonymous"; locale: Locale }
  | {
      authState: "signed_in";
      locale: Locale;
      userId: string;
      firstName: string | null;
      kycStatus: string;
      activeGoalCount: number;
      nextReminderDate: string | null;
      walletAvailableTzs: number;
      walletAllocatedTzs: number;
      walletTotalTzs: number;
      activeGoals: AssistantGoalSummary[];
    };

export type AssistantCallContext = {
  locale: Locale;
  user: AssistantUserContext;
  userId: string | null;
  supabase: SupabaseClient<Database> | null;
};

export async function buildAssistantContext(
  locale: Locale,
  req?: Request,
): Promise<AssistantCallContext> {
  const session = req ? await getSessionFromRequest(req) : await getSession();
  if (!session) {
    return {
      locale,
      user: { authState: "anonymous", locale },
      userId: null,
      supabase: null,
    };
  }

  const supabase = await supabaseForUser(req);
  if (!supabase) {
    return {
      locale,
      user: { authState: "anonymous", locale },
      userId: null,
      supabase: null,
    };
  }

  const admin = supabaseAdmin();
  const userId = session.claims.userId;
  const [{ data: profile }, { data: activeGoalRows }, wallet] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name, kyc_status")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("goals")
      .select(
        "reference, product_slug, product_price_tzs, contributed_tzs, monthly_target_tzs, next_reminder_date",
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("next_reminder_date", { ascending: true })
      .limit(5),
    getWalletBalance(userId),
  ]);

  const goalRows = activeGoalRows ?? [];
  const slugs = Array.from(new Set(goalRows.map((g) => g.product_slug)));
  const nameCol = locale === "sw" ? "name_sw" : "name_en";
  const productRows =
    slugs.length > 0
      ? (
          await admin
            .from("products")
            .select(`slug, ${nameCol}`)
            .in("slug", slugs)
        ).data ?? []
      : [];
  const nameBySlug = new Map<string, string>();
  for (const row of productRows as Array<Record<string, string>>) {
    nameBySlug.set(row.slug, row[nameCol]);
  }

  const activeGoals = goalRows.map((g) => ({
    reference: g.reference,
    productName: nameBySlug.get(g.product_slug) ?? g.product_slug,
    priceTzs: g.product_price_tzs,
    contributedTzs: g.contributed_tzs,
    monthlyTargetTzs: g.monthly_target_tzs,
    nextReminderDate: g.next_reminder_date,
  }));

  const nextReminderDate =
    goalRows.length > 0 ? goalRows[0].next_reminder_date : null;

  return {
    locale,
    userId,
    supabase,
    user: {
      authState: "signed_in",
      locale,
      userId,
      firstName: profile?.first_name ?? null,
      kycStatus: profile?.kyc_status ?? "none",
      activeGoalCount: activeGoals.length,
      nextReminderDate,
      walletAvailableTzs: wallet.availableTzs,
      walletAllocatedTzs: wallet.allocatedTzs,
      walletTotalTzs: wallet.totalTzs,
      activeGoals,
    },
  };
}
