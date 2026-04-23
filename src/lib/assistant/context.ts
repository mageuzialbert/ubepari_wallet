import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { supabaseForUser } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { getWalletSnapshot } from "@/lib/wallet-data";
import type { Locale } from "@/i18n/config";

export type AssistantUserContext =
  | { authState: "anonymous"; locale: Locale }
  | {
      authState: "signed_in";
      locale: Locale;
      userId: string;
      firstName: string | null;
      kycStatus: string;
      activeOrderCount: number;
      nextDueDate: string | null;
    };

export type AssistantCallContext = {
  locale: Locale;
  user: AssistantUserContext;
  userId: string | null;
  supabase: SupabaseClient<Database> | null;
};

export async function buildAssistantContext(
  locale: Locale,
): Promise<AssistantCallContext> {
  const session = await getSession();
  if (!session) {
    return {
      locale,
      user: { authState: "anonymous", locale },
      userId: null,
      supabase: null,
    };
  }

  const supabase = await supabaseForUser();
  if (!supabase) {
    return {
      locale,
      user: { authState: "anonymous", locale },
      userId: null,
      supabase: null,
    };
  }

  const snapshot = await getWalletSnapshot(
    supabase,
    session.claims.userId,
    locale,
  );

  return {
    locale,
    userId: session.claims.userId,
    supabase,
    user: {
      authState: "signed_in",
      locale,
      userId: session.claims.userId,
      firstName: snapshot?.profile.firstName ?? null,
      kycStatus: snapshot?.profile.kycStatus ?? "none",
      activeOrderCount: snapshot?.activeOrders.length ?? 0,
      nextDueDate: snapshot?.balance.nextDueDate ?? null,
    },
  };
}
