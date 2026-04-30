import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '@/state/auth';
import { useOnboardingStore } from '@/state/onboarding';

const MIN_VISIBLE_MS = 1500;

export default function SplashScreen() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    let cancelled = false;
    const startedAt = Date.now();

    const decideRoute = async () => {
      // Wait for both stores to be hydrated by the root layout's effect.
      await Promise.all([
        waitFor(() => useAuthStore.getState().hydrated),
        waitFor(() => useOnboardingStore.getState().hydrated),
      ]);
      if (cancelled) return;

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));
      if (cancelled) return;

      const auth = useAuthStore.getState();
      const onboarding = useOnboardingStore.getState();

      if (auth.session && auth.user) {
        if (auth.user.kycStatus !== 'approved') {
          router.replace('/(auth)/kyc');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
      if (auth.session && !auth.user) {
        // Token present but /me failed (offline). Treat as authed; tabs will retry.
        router.replace('/(tabs)');
        return;
      }
      if (!onboarding.completed) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(auth)/login');
      }
    };

    void decideRoute();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.Image
        source={require('../../assets/ubepari-wallet-icon.png')}
        style={[styles.icon, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

async function waitFor(predicate: () => boolean, intervalMs = 50, timeoutMs = 8000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 160,
    height: 160,
  },
});
