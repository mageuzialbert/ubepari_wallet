import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

let singleton: SupabaseClient<Database> | undefined;

export function supabaseAdmin(): SupabaseClient<Database> {
  if (!singleton) {
    singleton = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return singleton;
}
