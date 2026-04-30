import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { useOnboardingStore } from '@/state/onboarding';

const { width, height } = Dimensions.get('window');

const LAPTOP_IMAGE =
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=85';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useOnboardingStore((s) => s.complete);
  const { t } = useTranslation();
  const btnScale = useRef(new Animated.Value(1)).current;

  const handleGetStarted = () => {
    void completeOnboarding();
    router.replace('/(auth)/signup');
  };

  const handleHaveAccount = () => {
    void completeOnboarding();
    router.replace('/(auth)/login');
  };

  const onPressIn = () =>
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Full-bleed laptop image */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: LAPTOP_IMAGE }}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Subtle gradient fade at bottom of image */}
        <View style={styles.imageFade} />
      </View>

      {/* White card that slides up over the image */}
      <View style={[styles.card, { paddingBottom: insets.bottom + 32 }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <Text style={styles.title}>{t('onboarding.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.subtitle')}</Text>

        {/* CTA */}
        <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 8 }}>
          <TouchableOpacity
            style={styles.btn}
            onPress={handleGetStarted}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
          >
            <Text style={styles.btnText}>{t('onboarding.getStarted')}</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={handleHaveAccount} style={styles.skipWrap}>
          <Text style={styles.skipText}>{t('onboarding.haveAccount')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  imageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    // soft shadow handled by card overlap
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 12,
    // shadow so it floats above image
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  skipWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});