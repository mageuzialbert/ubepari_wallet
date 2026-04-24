import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/session";
import { supabaseForUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ user: null });

  const client = await supabaseForUser(req);
  const { data: profile } = await client!
    .from("profiles")
    .select(
      "first_name, last_name, email, kyc_status, credit_limit_tzs, credit_points",
    )
    .eq("id", session.claims.userId)
    .maybeSingle();

  return NextResponse.json({
    user: {
      id: session.claims.userId,
      phone: session.claims.phone,
      email: profile?.email ?? session.claims.email,
      firstName: profile?.first_name ?? null,
      lastName: profile?.last_name ?? null,
      kycStatus: profile?.kyc_status ?? "none",
      creditLimitTzs: profile?.credit_limit_tzs ?? 0,
      creditPoints: profile?.credit_points ?? 0,
    },
  });
}
