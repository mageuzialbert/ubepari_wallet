import "server-only";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Locale } from "@/i18n/config";

export type AdminContext = {
  userId: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session) return null;

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("id, phone, email, first_name, last_name, is_admin")
    .eq("id", session.claims.userId)
    .maybeSingle();

  if (!profile || !profile.is_admin) return null;

  return {
    userId: profile.id,
    phone: profile.phone,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
  };
}

export async function requireAdminPage(locale: Locale): Promise<AdminContext> {
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/signin?next=/${locale}/admin`);
  }

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("id, phone, email, first_name, last_name, is_admin")
    .eq("id", session.claims.userId)
    .maybeSingle();

  if (!profile || !profile.is_admin) {
    redirect(`/${locale}`);
  }

  return {
    userId: profile.id,
    phone: profile.phone,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
  };
}
