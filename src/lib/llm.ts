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
