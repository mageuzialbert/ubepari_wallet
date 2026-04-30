import Constants from "expo-constants";

import { tokenStorage } from "@/lib/auth/token-storage";
import { makeApiError, type ApiError } from "@/lib/errors";
import { currentLocale } from "@/lib/locale";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://www.ubeparipc.co.tz";

type OnUnauthorized = () => void;
let onUnauthorized: OnUnauthorized | null = null;

export function setUnauthorizedHandler(handler: OnUnauthorized): void {
  onUnauthorized = handler;
}

export function apiBaseUrl(): string {
  return BASE_URL;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await tokenStorage.read();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Locale", currentLocale());

  if (session && !tokenStorage.isExpired(session)) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    onUnauthorized?.();
  }
  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body
  }
  if (!res.ok) {
    const err: ApiError = makeApiError(res.status, body);
    throw err;
  }
  return body as T;
}
