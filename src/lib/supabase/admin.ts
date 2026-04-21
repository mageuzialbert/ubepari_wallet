import "server-only";
import { createClient } from "@supabase/supabase-js";

let singleton: ReturnType<typeof createClient> | undefined;

export function supabaseAdmin() {
  if (!singleton) {
    singleton = createClient(
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
