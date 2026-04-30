import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { apiJson } from "@/api/client";
import { useAuthStore, selectIsAuthed } from "@/auth/auth-store";

// Expo Go on Android removed remote-push support in SDK 53 and the
// expo-notifications module throws at *import time*. Lazily require it
// only in environments that support it; otherwise treat push as a no-op.
const isExpoGo = Constants.appOwnership === "expo";
type NotificationsModule = typeof import("expo-notifications");
const Notifications: NotificationsModule | null = isExpoGo
  ? null
  : (require("expo-notifications") as NotificationsModule);

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let lastRegisteredToken: string | null = null;

async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications) return null;
  if (!Device.isDevice) return null;
  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted =
      req.granted ||
      req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }
  if (!granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#1A2FB8",
    });
  }

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } })?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tok = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tok.data;
  } catch {
    return null;
  }
}

export async function registerPushTokenIfAuthed(): Promise<void> {
  if (!selectIsAuthed(useAuthStore.getState())) return;
  const token = await getExpoPushToken();
  if (!token || token === lastRegisteredToken) return;
  try {
    await apiJson("/api/push/register", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
      }),
    });
    lastRegisteredToken = token;
  } catch {
    // best-effort
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;
  try {
    await apiJson("/api/push/unregister", {
      method: "POST",
      body: JSON.stringify({ token: lastRegisteredToken }),
    });
  } catch {
    // best-effort
  }
  lastRegisteredToken = null;
}

// React hook: register on mount (once user is authed) and route on tap.
export function usePushRegistration() {
  const router = useRouter();
  const isAuthed = useAuthStore(selectIsAuthed);

  useEffect(() => {
    if (isAuthed) registerPushTokenIfAuthed();
  }, [isAuthed]);

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as
        | { goalId?: string; kind?: string }
        | undefined;
      if (data?.goalId) {
        router.push({ pathname: "/(tabs)/goals/[id]", params: { id: data.goalId } });
      }
    });
    return () => sub.remove();
  }, [router]);
}
