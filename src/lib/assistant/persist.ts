import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, AiMessageRole } from "@/lib/supabase/types";
import type { Locale } from "@/i18n/config";
import type { LlmMessage } from "@/lib/llm";

type Client = SupabaseClient<Database>;

export type StoredMessage = {
  id: string;
  role: AiMessageRole;
  content: string;
  toolCalls: Record<string, unknown>[] | null;
  toolCallId: string | null;
  toolName: string | null;
  createdAt: string;
};

export type ConversationMeta = {
  id: string;
  title: string | null;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
};

export async function listConversations(
  client: Client,
  userId: string,
  limit = 30,
): Promise<ConversationMeta[]> {
  const { data } = await client
    .from("ai_conversations")
    .select("id, title, locale, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    locale: r.locale,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createConversation(
  client: Client,
  userId: string,
  locale: Locale,
): Promise<ConversationMeta | null> {
  const { data, error } = await client
    .from("ai_conversations")
    .insert({ user_id: userId, locale })
    .select("id, title, locale, created_at, updated_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    locale: data.locale,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getConversation(
  client: Client,
  conversationId: string,
  userId: string,
): Promise<{ meta: ConversationMeta; messages: StoredMessage[] } | null> {
  const { data: conv } = await client
    .from("ai_conversations")
    .select("id, title, locale, created_at, updated_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!conv) return null;
  const { data: msgs } = await client
    .from("ai_messages")
    .select("id, role, content, tool_calls, tool_call_id, tool_name, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return {
    meta: {
      id: conv.id,
      title: conv.title,
      locale: conv.locale,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    },
    messages: (msgs ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.tool_calls,
      toolCallId: m.tool_call_id,
      toolName: m.tool_name,
      createdAt: m.created_at,
    })),
  };
}

export async function appendMessage(
  client: Client,
  conversationId: string,
  msg: {
    role: AiMessageRole;
    content: string;
    toolCalls?: Record<string, unknown>[] | null;
    toolCallId?: string | null;
    toolName?: string | null;
  },
): Promise<void> {
  await client.from("ai_messages").insert({
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
    tool_calls: msg.toolCalls ?? null,
    tool_call_id: msg.toolCallId ?? null,
    tool_name: msg.toolName ?? null,
  });
  await client
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function setConversationTitle(
  client: Client,
  conversationId: string,
  title: string,
): Promise<void> {
  await client
    .from("ai_conversations")
    .update({ title: title.slice(0, 80) })
    .eq("id", conversationId);
}

export async function deleteConversation(
  client: Client,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await client
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);
  return !error;
}

type AssistantToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

// Convert stored rows back into LLM message shape for a new turn.
// System messages are rebuilt each turn from buildSystemPrompt(), so stored
// system rows (if any) are skipped.
export function storedToLlm(messages: StoredMessage[]): LlmMessage[] {
  const out: LlmMessage[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content,
        tool_calls: Array.isArray(m.toolCalls)
          ? (m.toolCalls as unknown as AssistantToolCall[])
          : undefined,
      });
    } else if (m.role === "tool") {
      out.push({
        role: "tool",
        content: m.content,
        tool_call_id: m.toolCallId ?? "",
      });
    }
  }
  return out;
}
