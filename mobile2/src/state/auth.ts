import { create } from "zustand";

import { fetchMe, signOut as apiSignOut } from "@/lib/api/auth";
import { tokenStorage, type StoredSession } from "@/lib/auth/token-storage";
import type { User } from "@/types/api";
import { unregisterPushToken } from "@/lib/push";

type AuthState = {
  hydrated: boolean;
  session: StoredSession | null;
  user: User | null;
  hydrate: () => Promise<void>;
  signIn: (session: StoredSession) => Promise<User | null>;
  refreshMe: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  session: null,
  user: null,

  hydrate: async () => {
    const session = await tokenStorage.read();
    const fresh = session && !tokenStorage.isExpired(session) ? session : null;
    if (!fresh && session) await tokenStorage.clear();
    set({ session: fresh, hydrated: true });
    if (fresh) {
      try {
        const user = await fetchMe();
        set({ user });
      } catch {
        // offline or server down — keep session, let later calls revalidate
      }
    }
  },

  signIn: async (session) => {
    await tokenStorage.write(session);
    set({ session });
    try {
      const user = await fetchMe();
      set({ user });
      return user;
    } catch {
      return null;
    }
  },

  refreshMe: async () => {
    if (!get().session) return null;
    try {
      const user = await fetchMe();
      set({ user });
      return user;
    } catch {
      return null;
    }
  },

  signOut: async () => {
    // Unregister push first so the server stops sending to this device
    // (and we still have a valid token for the call).
    await unregisterPushToken();
    await apiSignOut();
    await tokenStorage.clear();
    set({ session: null, user: null });
  },
}));

export function selectIsAuthed(state: AuthState): boolean {
  return !!state.session && !tokenStorage.isExpired(state.session);
}
