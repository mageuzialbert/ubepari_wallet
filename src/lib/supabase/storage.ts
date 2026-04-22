import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function signKycDocumentUrl(
  path: string,
  ttlSeconds = 300,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from("kyc-documents")
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) {
    console.error("[storage] signKycDocumentUrl failed", { path, error: error?.message });
    return null;
  }
  return data.signedUrl;
}
