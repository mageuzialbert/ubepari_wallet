import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "ubepari.onboarding.v1";

type OnboardingState = {
  hydrated: boolean;
  completed: boolean;
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hydrated: false,
  completed: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ hydrated: true, completed: raw === "1" });
    } catch {
      set({ hydrated: true, completed: false });
    }
  },

  complete: async () => {
    set({ completed: true });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // best-effort
    }
  },
}));
