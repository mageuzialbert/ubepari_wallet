import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSession } from "@/lib/session";
import type { Database } from "@/lib/supabase/types";

function clientFor(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  );
}

export async function supabaseForUser(): Promise<SupabaseClient<Database> | null> {
  const session = await getSession();
  if (!session) return null;
  return clientFor(session.accessToken);
}

export async function requireSupabaseForUser(): Promise<{
  client: SupabaseClient<Database>;
  userId: string;
  phone: string;
  email: string | null;
}> {
  const session = await getSession();
  if (!session) throw new Error("unauthenticated");
  return {
    client: clientFor(session.accessToken),
    userId: session.claims.userId,
    phone: session.claims.phone,
    email: session.claims.email,
  };
}
