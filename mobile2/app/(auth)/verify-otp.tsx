import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import {
  LEGAL_VERSION,
  sendOtp,
  verifyOtp,
  type VerifyOtpInput,
} from '@/lib/api/auth';
import { useAuthStore } from '@/state/auth';
import { mapApiError } from '@/lib/errors';
import { formatPhoneDisplay } from '@/lib/phone';

const RESEND_SECONDS = 30;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    phone: string;
    flow: 'signup' | 'login';
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  }>();
  const signIn = useAuthStore((s) => s.signIn);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const handleVerify = async (full: string) => {
    setError(null);
    if (!params.phone) {
      setError(t('verifyOtp.errorMissingPhone'));
      return;
    }
    if (full.length !== 6) {
      setError(t('verifyOtp.errorInvalid'));
      return;
    }
    setLoading(true);
    try {
      const input: VerifyOtpInput = {
        phone: params.phone,
        code: full,
        flow: params.flow ?? 'login',
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email || undefined,
        acceptedTermsVersion: params.flow === 'signup' ? LEGAL_VERSION : undefined,
      };
      const { session } = await verifyOtp(input);
      const user = await signIn(session);
      if (params.flow === 'signup' || (user && user.kycStatus !== 'approved')) {
        router.replace('/(auth)/kyc');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(mapApiError(e));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading || !params.phone) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp(params.phone);
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setError(mapApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{t('verifyOtp.title')}</Text>
        <Text style={styles.subtitle}>
          {t('verifyOtp.subtitle', { phone: '' }).split('\n')[0]}{'\n'}
          <Text style={styles.phoneText}>{formatPhoneDisplay(params.phone ?? '')}</Text>
        </Text>

        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.codeWrap}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const ch = code[i] ?? '';
            return (
              <View key={i} style={[styles.codeBox, ch ? styles.codeBoxFilled : null]}>
                <Text style={styles.codeChar}>{ch}</Text>
              </View>
            );
          })}
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(v) => {
            const clean = v.replace(/\D/g, '').slice(0, 6);
            setCode(clean);
            if (clean.length === 6) {
              void handleVerify(clean);
            }
          }}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          style={styles.hiddenInput}
          autoFocus
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>{t('common.checking')}</Text>
          </View>
        )}

        <View style={styles.resendRow}>
          {resendIn > 0 ? (
            <Text style={styles.resendText}>
              {t('verifyOtp.resendIn', { seconds: resendIn })}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendLink}>{t('verifyOtp.resend')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: 22,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  phoneText: {
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
  },
  codeWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  codeChar: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: '#D6354A',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  resendRow: {
    paddingTop: 4,
  },
  resendText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  resendLink: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});
