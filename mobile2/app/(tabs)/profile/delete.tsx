import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../../constants/colors';
import { Fonts, FontSizes } from '../../../constants/typography';
import { confirmDelete, sendDeleteOtp } from '@/lib/api/account';
import { useAuthStore } from '@/state/auth';
import { mapApiError } from '@/lib/errors';

type Step = 'confirm' | 'otp';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const signOut = useAuthStore((s) => s.signOut);
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('confirm');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendDeleteOtp();
      setStep('otp');
    } catch (e) {
      setError(mapApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setError(null);
    if (code.length !== 6) {
      setError(t('profile.delete.errorCode'));
      return;
    }
    setLoading(true);
    try {
      await confirmDelete(code);
      await signOut();
      qc.clear();
      router.replace('/(auth)/splash');
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
        <Text style={styles.headerTitle}>{t('profile.delete.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.warnIcon}>
          <Ionicons name="alert-circle" size={42} color={Colors.error} />
        </View>
        <Text style={styles.title}>{t('profile.delete.warnTitle')}</Text>
        <Text style={styles.body1}>{t('profile.delete.warnBody')}</Text>

        {step === 'confirm' && (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, loading && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnText}>{t('profile.delete.sendOtp')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: Colors.textPrimary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.subtitle}>{t('profile.delete.subtitle')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={t('profile.delete.codePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, loading && styles.btnDisabled]}
              onPress={handleConfirmDelete}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnText}>{t('profile.delete.submit')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: Colors.textPrimary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
    alignItems: 'center',
    paddingBottom: 40,
  },
  warnIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  body1: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    alignSelf: 'stretch',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.error,
    alignSelf: 'stretch',
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnDanger: {
    backgroundColor: Colors.error,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceAlt,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
