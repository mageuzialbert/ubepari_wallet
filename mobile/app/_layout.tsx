import "../global.css";

import { useEffect, useState } from "react";
import { View, ActivityIndicator, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono";

import { initI18n } from "@/i18n";
import { useAuthStore } from "@/auth/auth-store";
import { AuthGate } from "@/auth/auth-gate";
import { brand } from "@/theme/tokens";
import { usePushRegistration } from "@/lib/push";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    "Geist-Regular": Geist_400Regular,
    "Geist-Medium": Geist_500Medium,
    "Geist-SemiBold": Geist_600SemiBold,
    "Geist-Bold": Geist_700Bold,
    "GeistMono-Regular": GeistMono_400Regular,
  });

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && i18nReady && hydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, i18nReady, hydrated]);

  const ready = fontsLoaded && i18nReady && hydrated;

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: brand.blueHex, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="white" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : ""}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <AuthGate>
            <AppShell />
          </AuthGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  usePushRegistration();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="kyc" options={{ presentation: "modal" }} />
      <Stack.Screen name="legal/privacy" options={{ headerShown: true, title: "Privacy" }} />
      <Stack.Screen name="legal/terms" options={{ headerShown: true, title: "Terms" }} />
    </Stack>
  );
}
