"use client";

import * as React from "react";

import type { ChatMessage } from "@/lib/assistant/anonStorage";
import type { CardPayload } from "@/lib/assistant/tools";

type ServerEvent =
  | { event: "meta"; data: { conversationId: string | null; authState: string } }
  | { event: "token"; data: { text: string } }
  | { event: "tool_call"; data: { id: string; name: string } }
  | { event: "tool_result"; data: { id: string; name: string } }
  | { event: "card"; data: CardPayload }
  | { event: "done"; data: { finishReason: string | null } }
  | { event: "error"; data: { reason: string } };

export type SendArgs = {
  message: string;
  conversationId?: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
};

export type UseChatStreamApi = {
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  conversationId: string | null;
  send: (args: SendArgs) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setConversationId: (id: string | null) => void;
  reset: () => void;
};

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function* parseSse(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        const lines = block.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          yield { event, data: parsed } as ServerEvent;
        } catch {
          // ignore malformed frames
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useChatStream(
  initial: ChatMessage[] = [],
  initialConversationId: string | null = null,
): UseChatStreamApi {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initial);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(
    initialConversationId,
  );

  const send = React.useCallback(
    async ({ message, conversationId: cid, history }: SendArgs) => {
      setError(null);
      setPending(true);

      const userMsg: ChatMessage = {
        id: randomId(),
        role: "user",
        content: message,
      };
      const assistantId = randomId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        cards: [],
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      let res: Response;
      try {
        res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: cid ?? conversationId ?? undefined,
            history,
          }),
        });
      } catch {
        setError("network");
        setPending(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
        return;
      }

      if (!res.ok || !res.body) {
        let reason = "generic";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) reason = body.error;
        } catch {
          // ignore
        }
        setError(reason);
        setPending(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
        return;
      }

      try {
        for await (const ev of parseSse(res.body)) {
          if (ev.event === "meta") {
            if (ev.data.conversationId) {
              setConversationId(ev.data.conversationId);
            }
          } else if (ev.event === "token") {
            const { text } = ev.data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + text }
                  : m,
              ),
            );
          } else if (ev.event === "card") {
            const card = ev.data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, cards: [...(m.cards ?? []), card] }
                  : m,
              ),
            );
          } else if (ev.event === "error") {
            setError(ev.data.reason ?? "generic");
          } else if (ev.event === "done") {
            // final event — no-op; we mark streaming=false below.
          }
        }
      } catch {
        setError("stream");
      } finally {
        setPending(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
      }
    },
    [conversationId],
  );

  const reset = React.useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    messages,
    pending,
    error,
    conversationId,
    send,
    setMessages,
    setConversationId,
    reset,
  };
}
