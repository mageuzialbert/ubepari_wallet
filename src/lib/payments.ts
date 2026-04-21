import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

const PENDING_WINDOW_SECONDS = 120;

// Returns true if the user has any payment row in status='pending' created
// within the last PENDING_WINDOW_SECONDS. Prevents a second push stacking on
// top of one the user is still confirming on their phone.
export async function hasPendingPush(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - PENDING_WINDOW_SECONDS * 1000).toISOString();
  const { data } = await supabaseAdmin()
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gt("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
