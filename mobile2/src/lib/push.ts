import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { registerPushToken, unregisterPushToken as apiUnregister } from '@/lib/api/push';
import { useAuthStore, selectIsAuthed } from '@/state/auth';

// Expo Go on Android removed remote-push support in SDK 53+ and the
// expo-notifications module throws at *import time*. Lazily require it
// only in environments that support it; otherwise treat push as a no-op.
const isExpoGo = Constants.appOwnership === 'expo';
type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');
const Notifications: NotificationsModule | null = isExpoGo
  ? null
  : (require('expo-notifications') as NotificationsModule);
const Device: DeviceModule | null = isExpoGo
  ? null
  : (require('expo-device') as DeviceModule);

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
  if (!Device?.isDevice) return null;
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#172FAB',
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
    const platform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await registerPushToken(token, platform);
    lastRegisteredToken = token;
  } catch {
    // best-effort
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;
  await apiUnregister(lastRegisteredToken);
  lastRegisteredToken = null;
}

/**
 * Hook: register the push token once authed, and route to the relevant
 * goal when a notification is tapped.
 */
export function usePushRegistration() {
  const router = useRouter();
  const isAuthed = useAuthStore(selectIsAuthed);

  useEffect(() => {
    if (isAuthed) void registerPushTokenIfAuthed();
  }, [isAuthed]);

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as
        | { goalId?: string; kind?: string }
        | undefined;
      if (data?.goalId) {
        router.push(`/installment/${data.goalId}` as const);
      }
    });
    return () => sub.remove();
  }, [router]);
}
