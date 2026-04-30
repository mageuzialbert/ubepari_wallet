const TZ_PHONE_RE = /^255[67]\d{8}$/;

export type NormalizedPhone =
  | { valid: true; value: string }
  | { valid: false };

export function normalizeTzPhone(raw: string): NormalizedPhone {
  const digits = raw.replace(/[\s()+-]/g, "");
  let candidate = digits;
  if (candidate.startsWith("0")) candidate = "255" + candidate.slice(1);
  else if (candidate.startsWith("255")) candidate = candidate;
  else if (candidate.length === 9) candidate = "255" + candidate;

  if (!TZ_PHONE_RE.test(candidate)) return { valid: false };
  return { valid: true, value: candidate };
}

export function maskPhone(phone: string): string {
  if (!TZ_PHONE_RE.test(phone)) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ••• ${phone.slice(9)}`;
}

export function formatPhoneDisplay(phone: string): string {
  if (!TZ_PHONE_RE.test(phone)) return phone;
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}
