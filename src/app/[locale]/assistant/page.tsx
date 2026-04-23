import type { Metadata } from "next";

import { hasLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getDictionary } from "@/app/[locale]/dictionaries";
import { AssistantShell } from "@/components/assistant/assistant-shell";
import {
  listConversations,
  type ConversationMeta,
} from "@/lib/assistant/persist";
import { supabaseForUser } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.assistant.metaTitle,
  };
}

export default async function AssistantPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  let initial: ConversationMeta[] = [];
  const session = await getSession();
  if (session) {
    const client = await supabaseForUser();
    if (client) {
      initial = await listConversations(client, session.claims.userId);
    }
  }

  const items = initial.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
  }));

  return <AssistantShell initialConversations={items} />;
}
