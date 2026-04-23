import { type NextRequest } from "next/server";

import { defaultLocale, hasLocale, type Locale } from "@/i18n/config";
import { askLlmStream, type LlmMessage, type LlmToolCall } from "@/lib/llm";
import { buildAssistantContext } from "@/lib/assistant/context";
import { buildSystemPrompt } from "@/lib/assistant/prompts";
import {
  assistantToolSchemas,
  executeAssistantTool,
  type CardPayload,
} from "@/lib/assistant/tools";
import {
  appendMessage,
  createConversation,
  getConversation,
  storedToLlm,
} from "@/lib/assistant/persist";
import { checkRate, clientIp } from "@/lib/rate-limit";
import { logEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOOL_DEPTH = 3;
const HISTORY_CAP = 12;
const MESSAGE_MAX = 2000;
const MESSAGE_MIN = 1;

type ChatBody = {
  conversationId?: unknown;
  message?: unknown;
  history?: unknown;
};

function sseEncoder() {
  const encoder = new TextEncoder();
  return (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function readLocale(req: NextRequest): Locale {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  return cookie && hasLocale(cookie) ? cookie : defaultLocale;
}

function sanitizeHistory(raw: unknown): LlmMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: LlmMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const role = typeof obj.role === "string" ? obj.role : "";
    const content = typeof obj.content === "string" ? obj.content : "";
    if (role === "user" || role === "assistant") {
      out.push({ role, content });
    }
  }
  return out.slice(-HISTORY_CAP);
}

export async function POST(req: NextRequest) {
  const locale = readLocale(req);

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < MESSAGE_MIN) {
    return Response.json({ error: "too_short" }, { status: 400 });
  }
  if (message.length > MESSAGE_MAX) {
    return Response.json({ error: "too_long" }, { status: 400 });
  }

  const ctx = await buildAssistantContext(locale);
  const isSignedIn = ctx.user.authState === "signed_in";

  // Rate limits — signed-in by userId, anonymous by IP (hourly + daily).
  if (isSignedIn && ctx.userId) {
    const rate = checkRate(`assistant:chat:uid:${ctx.userId}`, 20, 60 * 60);
    if (!rate.ok) {
      return Response.json(
        {
          error: "rate_limited",
          retryInSeconds: rate.resetInSeconds,
        },
        { status: 429 },
      );
    }
  } else {
    const ip = clientIp(req);
    const hourly = checkRate(`assistant:chat:ip:h:${ip}`, 10, 60 * 60);
    if (!hourly.ok) {
      return Response.json(
        {
          error: "rate_limited",
          retryInSeconds: hourly.resetInSeconds,
        },
        { status: 429 },
      );
    }
    const daily = checkRate(`assistant:chat:ip:d:${ip}`, 60, 24 * 60 * 60);
    if (!daily.ok) {
      return Response.json(
        {
          error: "rate_limited",
          retryInSeconds: daily.resetInSeconds,
        },
        { status: 429 },
      );
    }
  }

  // Hydrate prior messages.
  let conversationId: string | null = null;
  let priorMessages: LlmMessage[] = [];
  let isFirstTurn = false;

  if (isSignedIn && ctx.supabase && ctx.userId) {
    const requested =
      typeof body.conversationId === "string" ? body.conversationId : "";
    if (requested) {
      const existing = await getConversation(
        ctx.supabase,
        requested,
        ctx.userId,
      );
      if (!existing) {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      conversationId = existing.meta.id;
      priorMessages = storedToLlm(existing.messages).slice(-HISTORY_CAP);
      isFirstTurn = existing.messages.length === 0;
    } else {
      const created = await createConversation(
        ctx.supabase,
        ctx.userId,
        locale,
      );
      if (!created) {
        return Response.json({ error: "persist_failed" }, { status: 500 });
      }
      conversationId = created.id;
      isFirstTurn = true;
    }
    await appendMessage(ctx.supabase, conversationId, {
      role: "user",
      content: message,
    });
  } else {
    priorMessages = sanitizeHistory(body.history);
  }

  const systemPrompt = buildSystemPrompt(ctx.user);
  const messages: LlmMessage[] = [
    { role: "system", content: systemPrompt },
    ...priorMessages,
    { role: "user", content: message },
  ];

  const tools = assistantToolSchemas();
  const toSseChunk = sseEncoder();

  const turnStartedAt = Date.now();
  const turnMeta = {
    locale,
    authState: ctx.user.authState,
    conversationId: conversationId ?? null,
    toolCallsTotal: 0,
    toolRounds: 0,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(toSseChunk(event, data));
        } catch {
          // Client disconnected; continue for persistence side-effects.
        }
      };

      send("meta", {
        conversationId,
        authState: ctx.user.authState,
      });

      try {
        for (let depth = 0; depth < MAX_TOOL_DEPTH; depth++) {
          let assistantContent = "";
          const toolCalls: LlmToolCall[] = [];
          let finishReason: string | null = null;
          let hadError = false;

          for await (const ev of askLlmStream({
            messages,
            tools,
            maxTokens: 500,
            temperature: 0.3,
          })) {
            if (ev.type === "token") {
              assistantContent += ev.text;
              send("token", { text: ev.text });
            } else if (ev.type === "tool_call") {
              toolCalls.push(ev.call);
            } else if (ev.type === "done") {
              finishReason = ev.finishReason;
            } else if (ev.type === "error") {
              send("error", { reason: ev.reason });
              hadError = true;
            }
          }

          if (hadError) break;

          // Persist this assistant turn (content + any tool calls it issued).
          if (conversationId && ctx.supabase) {
            await appendMessage(ctx.supabase, conversationId, {
              role: "assistant",
              content: assistantContent,
              toolCalls:
                toolCalls.length > 0
                  ? toolCalls.map((c) => ({
                      id: c.id,
                      type: "function",
                      function: { name: c.name, arguments: c.arguments },
                    }))
                  : null,
            });
          }

          messages.push({
            role: "assistant",
            content: assistantContent,
            tool_calls:
              toolCalls.length > 0
                ? toolCalls.map((c) => ({
                    id: c.id,
                    type: "function",
                    function: { name: c.name, arguments: c.arguments },
                  }))
                : undefined,
          });

          // If the model is done, we are done.
          if (toolCalls.length === 0 || finishReason !== "tool_calls") {
            send("done", { finishReason });
            break;
          }

          // Execute each tool call, forward cards, persist tool messages.
          turnMeta.toolRounds += 1;
          for (const call of toolCalls) {
            turnMeta.toolCallsTotal += 1;
            send("tool_call", { id: call.id, name: call.name });
            const result = await executeAssistantTool(
              call.name,
              call.arguments,
              ctx,
            );
            const content = JSON.stringify(result.toModel);
            if (result.cards) {
              for (const card of result.cards as CardPayload[]) {
                send("card", card);
              }
            }
            if (conversationId && ctx.supabase) {
              await appendMessage(ctx.supabase, conversationId, {
                role: "tool",
                content,
                toolCallId: call.id,
                toolName: call.name,
              });
            }
            messages.push({
              role: "tool",
              content,
              tool_call_id: call.id,
            });
            send("tool_result", { id: call.id, name: call.name });
          }

          if (depth === MAX_TOOL_DEPTH - 1) {
            // Last allowed round executed tools; run one more inference turn
            // without tools enabled by breaking here — but our loop increments
            // depth before re-entering. Safer to explicitly surface.
            send("error", { reason: "tool_depth_exceeded" });
            break;
          }
        }
      } catch (err) {
        send("error", {
          reason: String(err instanceof Error ? err.message : err),
        });
      } finally {
        logEvent("assistant.turn", {
          ...turnMeta,
          latencyMs: Date.now() - turnStartedAt,
        });
        controller.close();
      }
    },
    cancel() {
      // Client disconnected — DB writes above already completed synchronously
      // in the generator since persistence is awaited per turn.
      logEvent("assistant.turn_cancelled", turnMeta);
    },
  });

  // Fire-and-forget title generation for brand-new conversations.
  if (isSignedIn && isFirstTurn && conversationId && ctx.supabase) {
    generateTitleInBackground(message, conversationId, ctx.supabase).catch(
      (err: unknown) => {
        logEvent("assistant.title_failed", {
          reason: String(err instanceof Error ? err.message : err),
        });
      },
    );
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

// Title generation uses the cheap non-streaming askLlm with response_format=json_object.
type NonNullableSupabase = NonNullable<
  Awaited<ReturnType<typeof buildAssistantContext>>["supabase"]
>;

async function generateTitleInBackground(
  firstMessage: string,
  conversationId: string,
  client: NonNullableSupabase,
): Promise<void> {
  const { askLlm } = await import("@/lib/llm");
  const { buildTitlePrompt } = await import("@/lib/assistant/prompts");
  const { setConversationTitle } = await import("@/lib/assistant/persist");
  const prompt = buildTitlePrompt(firstMessage);
  const result = await askLlm({
    system: prompt.system,
    user: prompt.user,
    jsonOutput: true,
    maxTokens: 40,
    temperature: 0.2,
  });
  if (!result.ok) return;
  try {
    const parsed = JSON.parse(result.content) as { title?: unknown };
    if (typeof parsed.title === "string" && parsed.title.trim().length > 0) {
      await setConversationTitle(client, conversationId, parsed.title.trim());
    }
  } catch {
    // ignore
  }
}
