import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import { passwordLogin } from '@/lib/api/auth';
import { useAuthStore } from '@/state/auth';
import { normalizeTzPhone } from '@/lib/phone';
import { mapApiError } from '@/lib/errors';

const LAPTOP_IMAGE = 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=85';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t('login.errorPhone'));
      return;
    }
    if (password.length < 8) {
      setError(t('login.errorPassword'));
      return;
    }
    setLoading(true);
    try {
      const { session } = await passwordLogin(normalized.value, password);
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <Image source={{ uri: LAPTOP_IMAGE }} style={styles.bg} resizeMode="cover" />

      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)', 'rgba(0,0,0,0.92)']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.layout}>
        <View style={styles.spacer} />
        <View style={styles.titleWrap}>
          <Text style={styles.headingMain}>{t('login.headingMain')}</Text>
          <Text style={styles.headingSub}>{t('login.headingSub')}</Text>
        </View>

        <View style={[styles.card, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>{t('login.phoneLabel')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('login.phonePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>{t('login.passwordLabel')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={t('login.passwordPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              editable={!loading}
              onSubmitEditing={handleLogin}
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

        <View style={styles.row}>
          <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
              {rememberMe && <Ionicons name="checkmark" size={12} color={Colors.white} />}
            </View>
            <Text style={styles.rememberText}>{t('login.rememberMe')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot' as const)}>
            <Text style={styles.forgotText}>{t('login.forgot')}</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <View style={styles.btnLoading}>
            <ActivityIndicator color={Colors.white} />
          </View>
        ) : (
          <PrimaryButton title={t('login.submit')} onPress={handleLogin} size="lg" />
        )}

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-in-otp' as const)} style={styles.otpRow}>
          <Text style={styles.otpText}>{t('login.otpSwitch')}</Text>
        </TouchableOpacity>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>{t('login.noAccount')} </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
            <Text style={styles.signupLink}>{t('login.register')}</Text>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  layout: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  titleWrap: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    gap: 4,
  },
  headingMain: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
  },
  headingSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 14,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  forgotText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: '#D6354A',
    paddingHorizontal: 4,
  },
  btnLoading: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  otpText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
});
