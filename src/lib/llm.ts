import "server-only";

export type LlmRequest = {
  system: string;
  user: string;
  jsonOutput?: boolean;
  maxTokens?: number;
  temperature?: number;
};

export type LlmResult =
  | { ok: true; content: string }
  | { ok: false; reason: string };

// --- Classic one-shot JSON call (kept for /api/assistant/title and legacy use).

export async function askLlm(req: LlmRequest): Promise<LlmResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, reason: "not_configured" };
  const org = process.env.OPENAI_ORGANIZATION;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    temperature: req.temperature ?? 0.3,
    max_tokens: req.maxTokens ?? 400,
  };
  if (req.jsonOutput) body.response_format = { type: "json_object" };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(org ? { "OpenAI-Organization": org } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: `openai_${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") return { ok: false, reason: "empty_response" };
    return { ok: true, content };
  } catch (err) {
    return { ok: false, reason: String(err instanceof Error ? err.message : err) };
  }
}

// --- Streaming chat with tool-calling (used by /api/assistant/chat).

export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string;
      tool_calls?: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    }
  | { role: "tool"; content: string; tool_call_id: string };

export type LlmToolDecl = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type LlmToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type LlmStreamEvent =
  | { type: "token"; text: string }
  | { type: "tool_call"; call: LlmToolCall }
  | { type: "done"; finishReason: string | null }
  | { type: "error"; reason: string };

export type LlmStreamRequest = {
  messages: LlmMessage[];
  tools?: LlmToolDecl[];
  temperature?: number;
  maxTokens?: number;
};

export async function* askLlmStream(
  req: LlmStreamRequest,
): AsyncGenerator<LlmStreamEvent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    yield { type: "error", reason: "not_configured" };
    return;
  }
  const org = process.env.OPENAI_ORGANIZATION;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const body: Record<string, unknown> = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.3,
    max_tokens: req.maxTokens ?? 500,
    stream: true,
  };
  if (req.tools && req.tools.length > 0) {
    body.tools = req.tools;
    body.tool_choice = "auto";
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(org ? { "OpenAI-Organization": org } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    yield { type: "error", reason: String(err instanceof Error ? err.message : err) };
    return;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    yield { type: "error", reason: `openai_${res.status}: ${text.slice(0, 200)}` };
    return;
  }

  // Accumulate tool-call fragments by index — OpenAI streams name/args in pieces.
  const toolAcc: Record<
    number,
    { id: string; name: string; arguments: string }
  > = {};
  let finishReason: string | null = null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const rawLine = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!rawLine || !rawLine.startsWith("data:")) continue;
        const payload = rawLine.slice(5).trim();
        if (payload === "[DONE]") {
          for (const call of Object.values(toolAcc)) {
            yield { type: "tool_call", call };
          }
          yield { type: "done", finishReason };
          return;
        }

        let chunk: {
          choices?: {
            delta?: {
              content?: string;
              tool_calls?: {
                index: number;
                id?: string;
                type?: string;
                function?: { name?: string; arguments?: string };
              }[];
            };
            finish_reason?: string | null;
          }[];
        };
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue;
        }
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta ?? {};
        if (typeof delta.content === "string" && delta.content.length > 0) {
          yield { type: "token", text: delta.content };
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const piece of delta.tool_calls) {
            const acc = toolAcc[piece.index] ?? { id: "", name: "", arguments: "" };
            if (piece.id) acc.id = piece.id;
            if (piece.function?.name) acc.name = piece.function.name;
            if (piece.function?.arguments)
              acc.arguments += piece.function.arguments;
            toolAcc[piece.index] = acc;
          }
        }
        if (typeof choice.finish_reason === "string") {
          finishReason = choice.finish_reason;
        }
      }
    }
  } catch (err) {
    yield { type: "error", reason: String(err instanceof Error ? err.message : err) };
    return;
  }

  for (const call of Object.values(toolAcc)) {
    yield { type: "tool_call", call };
  }
  yield { type: "done", finishReason };
}
