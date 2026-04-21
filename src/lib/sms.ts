import "server-only";

type SendResult = { ok: true } | { ok: false; reason: string };

export async function sendSms(to: string, text: string): Promise<SendResult> {
  const username = process.env.SMS_USERNAME;
  const password = process.env.SMS_PASSWORD;
  const from = process.env.SMS_SENDER_ID ?? "Ubepari Pc";
  const baseUrl = process.env.SMS_BASE_URL;

  if (!username || !password || !baseUrl) {
    return { ok: false, reason: "sms-not-configured" };
  }

  const url = new URL(baseUrl);
  url.searchParams.set("username", username);
  url.searchParams.set("password", password);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("text", text);

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `gateway-${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err instanceof Error ? err.message : err) };
  }
}
