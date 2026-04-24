import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { supabaseForUser } from "@/lib/supabase/server";
import { getSession, getSessionFromRequest } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Locale } from "@/i18n/config";

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
  const [{ data: profile }, { data: goals }] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name, kyc_status")
      .eq("id", session.claims.userId)
      .maybeSingle(),
    admin
      .from("goals")
      .select("next_reminder_date")
      .eq("user_id", session.claims.userId)
      .eq("status", "active")
      .order("next_reminder_date", { ascending: true })
      .limit(1),
  ]);

  const nextReminderDate =
    goals && goals.length > 0 ? goals[0].next_reminder_date : null;
  const { count: activeCount } = await admin
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.claims.userId)
    .eq("status", "active");

  return {
    locale,
    userId: session.claims.userId,
    supabase,
    user: {
      authState: "signed_in",
      locale,
      userId: session.claims.userId,
      firstName: profile?.first_name ?? null,
      kycStatus: profile?.kyc_status ?? "none",
      activeGoalCount: activeCount ?? 0,
      nextReminderDate,
    },
  };
}
