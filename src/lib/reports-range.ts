import "server-only";

export const RANGE_KEYS = ["today", "7d", "30d", "90d", "ytd"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export const DEFAULT_RANGE: RangeKey = "30d";

export type Range = {
  key: RangeKey;
  since: Date;
  until: Date;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfYear(d: Date): Date {
  const x = new Date(d);
  x.setMonth(0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function parseRangeKey(raw: string | undefined | null): RangeKey {
  if (raw && (RANGE_KEYS as readonly string[]).includes(raw)) {
    return raw as RangeKey;
  }
  return DEFAULT_RANGE;
}

export function resolveRange(key: RangeKey, now: Date = new Date()): Range {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  switch (key) {
    case "today":
      return { key, since: today, until: tomorrow };
    case "7d":
      return { key, since: addDays(today, -6), until: tomorrow };
    case "30d":
      return { key, since: addDays(today, -29), until: tomorrow };
    case "90d":
      return { key, since: addDays(today, -89), until: tomorrow };
    case "ytd":
      return { key, since: startOfYear(today), until: tomorrow };
  }
}

export function parseRangeFromSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): Range {
  const raw =
    sp instanceof URLSearchParams ? sp.get("range") : (sp.range as string | undefined);
  return resolveRange(parseRangeKey(typeof raw === "string" ? raw : undefined));
}
