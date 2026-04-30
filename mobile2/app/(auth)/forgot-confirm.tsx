import React, { useState } from 'react';
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
import { confirmPasswordReset, requestPasswordReset } from '@/lib/api/auth';
import { useAuthStore } from '@/state/auth';
import { mapApiError } from '@/lib/errors';
import { formatPhoneDisplay } from '@/lib/phone';

export default function ForgotConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone: string }>();
  const signIn = useAuthStore((s) => s.signIn);
  const { t } = useTranslation();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    if (!params.phone) {
      setError(t('forgotConfirm.errorMissing'));
      return;
    }
    if (code.length !== 6) {
      setError(t('forgotConfirm.errorCode'));
      return;
    }
    if (password.length < 8) {
      setError(t('forgotConfirm.errorPassword'));
      return;
    }
    setLoading(true);
    try {
      const { session } = await confirmPasswordReset(params.phone, code, password);
      const user = await signIn(session);
      if (user && user.kycStatus !== 'approved') {
        router.replace('/(auth)/kyc');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(mapApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!params.phone) return;
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(params.phone);
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
        <Text style={styles.title}>{t('forgotConfirm.title')}</Text>
        <Text style={styles.subtitle}>
          {t('forgotConfirm.subtitle', { phone: '' }).split('\n')[0]}{'\n'}
          <Text style={styles.phoneText}>{formatPhoneDisplay(params.phone ?? '')}</Text>
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('forgotConfirm.codeLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('forgotConfirm.codePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('forgotConfirm.newPasswordLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={t('forgotConfirm.newPasswordPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              onSubmitEditing={handleConfirm}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>{t('forgotConfirm.submit')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={loading} style={styles.resendRow}>
          <Text style={styles.resendLink}>{t('forgotConfirm.resend')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { padding: 6 },
  body: { paddingHorizontal: 28, paddingTop: 16, gap: 18 },
  title: { fontFamily: Fonts.bold, fontSize: FontSizes['2xl'], color: Colors.textPrimary },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  phoneText: { fontFamily: Fonts.semiBold, color: Colors.textPrimary },
  field: { gap: 7 },
  label: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 4, marginLeft: 8 },
  errorText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: '#D6354A' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  resendRow: { alignItems: 'center', paddingVertical: 4 },
  resendLink: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.primary },
});
