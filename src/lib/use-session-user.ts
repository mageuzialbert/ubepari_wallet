"use client";

import * as React from "react";

export type SessionUser = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  kycStatus: "none" | "pending" | "approved" | "rejected";
  creditLimitTzs: number;
  creditPoints: number;
};

type State = {
  user: SessionUser | null;
  loading: boolean;
};

type Listener = (state: State) => void;

let cache: State = { user: null, loading: true };
let inflight: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener(cache);
}

async function fetchMe(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json()) as { user: SessionUser | null };
      cache = { user: json.user ?? null, loading: false };
    } catch {
      cache = { user: null, loading: false };
    } finally {
      inflight = null;
      notify();
    }
  })();
  return inflight;
}

export function useSessionUser(): {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = React.useState<State>(cache);

  React.useEffect(() => {
    listeners.add(setState);
    if (cache.loading && !inflight) void fetchMe();
    else setState(cache);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const refresh = React.useCallback(async () => {
    cache = { ...cache, loading: true };
    notify();
    await fetchMe();
  }, []);

  const signOut = React.useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    cache = { user: null, loading: false };
    notify();
  }, []);

  return { user: state.user, loading: state.loading, refresh, signOut };
}
