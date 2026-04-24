import * as SecureStore from "expo-secure-store";

const KEY = "ubepari.session.v1";

export type StoredSession = {
  token: string;
  expiresAt: string; // ISO
};

export const tokenStorage = {
  async read(): Promise<StoredSession | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (typeof parsed.token !== "string" || typeof parsed.expiresAt !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  },
  async write(session: StoredSession): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  },
  isExpired(session: StoredSession | null): boolean {
    if (!session) return true;
    return new Date(session.expiresAt).getTime() <= Date.now();
  },
};
