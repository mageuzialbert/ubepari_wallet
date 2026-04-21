"use client";

import { createBrowserClient } from "@supabase/ssr";

let singleton: ReturnType<typeof createBrowserClient> | undefined;

export function supabaseBrowser() {
  if (!singleton) {
    singleton = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return singleton;
}
