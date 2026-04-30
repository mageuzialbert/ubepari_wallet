import { t } from '@/i18n';

export type ApiError = {
  status: number;
  code?: string;
  detail?: string;
  message: string;
};

function translate(code: string, fallback?: string): string {
  const key = `errors.${code}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return fallback ?? t('errors.unknown');
}

export function mapApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (typeof code === 'string') return translate(code);
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: string }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  if (err instanceof Error) return err.message;
  return t('errors.unknown');
}

export function makeApiError(status: number, body: unknown): ApiError {
  const record = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const code = typeof record.error === 'string' ? record.error : undefined;
  const detail = typeof record.detail === 'string' ? record.detail : undefined;
  const message = code ? translate(code, detail) : detail ?? t('errors.unknown');
  return { status, code, detail, message };
}

export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}
