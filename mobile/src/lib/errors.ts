export type ApiError = {
  status: number;
  code?: string;
  detail?: string;
  message: string;
};

const MESSAGES: Record<string, string> = {
  invalid_phone: "Enter a valid Tanzanian phone number.",
  too_many_requests: "Too many attempts. Try again later.",
  expired: "That code expired. Request a new one.",
  wrong: "Wrong code. Try again.",
  too_many_attempts: "Too many wrong attempts. Request a new code.",
  sms_failed: "We could not send the SMS. Try again.",
  consent_required: "Please accept the terms to continue.",
  invalid_credentials: "Phone or password is incorrect.",
  locked: "Account temporarily locked. Try again in 30 minutes.",
  not_registered: "No account found for that phone.",
  not_found: "Not found.",
  weak_password: "Password must be at least 8 characters.",
  auth_required: "Please sign in to continue.",
  kyc_required: "Complete KYC to use this feature.",
  max_active_goals: "You already have 3 active goals.",
  goal_inactive: "This goal is no longer active.",
  invalid_amount: "Enter an amount between TZS 1,000 and TZS 5,000,000.",
  mno_unavailable: "Mobile money is unavailable right now. Try again.",
  invalid_nida: "NIDA number must be 20 digits.",
  missing_name: "Please enter your legal name.",
  missing_doc: "Attach a photo or PDF of your ID.",
  doc_too_large: "File is too large (max 5 MB).",
  doc_type: "Only JPEG, PNG or PDF files are allowed.",
  invalid_email: "Enter a valid email address.",
  name_too_long: "Name is too long.",
  unknown: "Something went wrong. Try again.",
};

export function mapApiError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code && MESSAGES[code]) return MESSAGES[code];
  }
  if (err instanceof Error) return err.message;
  return MESSAGES.unknown;
}

export function makeApiError(status: number, body: unknown): ApiError {
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const code = typeof record.error === "string" ? record.error : undefined;
  const detail = typeof record.detail === "string" ? record.detail : undefined;
  const message = code && MESSAGES[code] ? MESSAGES[code] : detail ?? MESSAGES.unknown;
  return { status, code, detail, message };
}
