import "server-only";
import { createHash, randomInt } from "node:crypto";

export type EvmarkProvider = "mpesa" | "tigopesa" | "airtelmoney";

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

function formatDateEat(d: Date): string {
  const eat = new Date(d.getTime() + EAT_OFFSET_MS);
  const dd = String(eat.getUTCDate()).padStart(2, "0");
  const mm = String(eat.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = eat.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function dailyHash(user: string, at: Date = new Date()): string {
  return createHash("md5").update(`${user}|${formatDateEat(at)}`).digest("hex");
}

export function isValidCallbackHash(received: string, user: string): boolean {
  const now = new Date();
  if (received === dailyHash(user, now)) return true;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return received === dailyHash(user, yesterday);
}

// Reference format: 4 random alnum (ambiguity-free alphabet) + "X" + phone without leading 255
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateReference(phone: string): string {
  let prefix = "";
  for (let i = 0; i < 4; i++) {
    prefix += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  }
  const localPart = phone.startsWith("255") ? phone.slice(3) : phone;
  return `${prefix}X${localPart}`;
}

function providerToEvmarkLabel(p: EvmarkProvider): string {
  return p === "mpesa" ? "Mpesa" : p === "tigopesa" ? "TigoPesa" : "AirtelMoney";
}

export type PushOptions = {
  amount: number;
  productLabel: string;
  mobileNo: string;
  reference: string;
  provider: EvmarkProvider;
};

export type PushResult =
  | { ok: true; hash: string; raw: Record<string, unknown> }
  | { ok: false; reason: string; raw?: Record<string, unknown> };

export async function pushMno(opts: PushOptions): Promise<PushResult> {
  const user = process.env.EVMARK_USER;
  const apiSource = process.env.EVMARK_API_SOURCE ?? user;
  const url = process.env.EVMARK_MNO_URL;
  const callback = process.env.EVMARK_MNO_CALLBACK_URL;

  if (!user || !url || !callback) {
    return { ok: false, reason: "evmark-not-configured" };
  }

  const hash = dailyHash(user);
  const body = {
    api_source: apiSource,
    api_to: providerToEvmarkLabel(opts.provider),
    amount: opts.amount,
    product: opts.productLabel,
    callback,
    hash,
    user,
    mobileNo: opts.mobileNo,
    reference: opts.reference,
    callbackstatus: "Success",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof raw.response_code === "number" ? raw.response_code : res.status;
    if (code === 200) {
      return { ok: true, hash, raw };
    }
    const desc = typeof raw.response_desc === "string" ? raw.response_desc : "";
    return { ok: false, reason: `evmark_${code}: ${desc}`, raw };
  } catch (err) {
    return { ok: false, reason: String(err instanceof Error ? err.message : err) };
  }
}

export type CallbackBody = {
  ResultType: unknown;
  TransactionStatus?: unknown;
  TransID?: unknown;
  Amount?: unknown;
  Hash?: unknown;
  ThirdPartyReference?: unknown;
};

export type ParsedCallback = {
  success: boolean;
  transactionStatus: string;
  transId: string | null;
  amount: string | null;
  hash: string | null;
  reference: string;
};

export function parseCallback(body: CallbackBody): ParsedCallback | null {
  const ref = typeof body.ThirdPartyReference === "string" ? body.ThirdPartyReference : null;
  if (!ref) return null;
  const status = typeof body.TransactionStatus === "string" ? body.TransactionStatus : "";
  const success =
    body.ResultType === true ||
    body.ResultType === "true" ||
    /success/i.test(status);
  return {
    success,
    transactionStatus: status,
    transId: typeof body.TransID === "string" ? body.TransID : null,
    amount: typeof body.Amount === "string" ? body.Amount : null,
    hash: typeof body.Hash === "string" ? body.Hash : null,
    reference: ref,
  };
}
