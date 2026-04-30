import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Gabarito_400Regular,
  Gabarito_500Medium,
  Gabarito_600SemiBold,
  Gabarito_700Bold,
} from '@expo-google-fonts/gabarito';

import { queryClient } from '@/lib/query';
import { setUnauthorizedHandler } from '@/lib/api/client';
import { initI18n } from '@/i18n';
import { useAuthStore } from '@/state/auth';
import { useOnboardingStore } from '@/state/onboarding';
import { usePushRegistration } from '@/lib/push';

// Prevent native splash from hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  usePushRegistration();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Gabarito-Regular': Gabarito_400Regular,
    'Gabarito-Medium': Gabarito_500Medium,
    'Gabarito-SemiBold': Gabarito_600SemiBold,
    'Gabarito-Bold': Gabarito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const [i18nReady, setI18nReady] = useState(false);

  // Boot once: init i18n FIRST, then hydrate auth + onboarding from storage.
  // Components depend on i18n being initialized before they render.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initI18n();
      if (cancelled) return;
      setI18nReady(true);
      await Promise.all([
        useAuthStore.getState().hydrate(),
        useOnboardingStore.getState().hydrate(),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Global 401 handler — clear local session and route to splash.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void useAuthStore.getState().signOut();
      router.replace('/(auth)/splash');
    });
  }, []);

  if ((!fontsLoaded && !fontError) || !i18nReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <StatusBar style="auto" />
        <RootLayoutInner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="product/[slug]"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="installment/[id]"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="add-funds"
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="chat"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
