import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

const HEADER_HEIGHT = Dimensions.get('window').height * 0.28;
const LAPTOP_IMAGE = 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=85';
import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { checkPhoneExists, sendOtp } from '@/lib/api/auth';
import { normalizeTzPhone } from '@/lib/phone';
import { mapApiError } from '@/lib/errors';
import { apiBaseUrl } from '@/lib/api/client';
import { currentLocale } from '@/lib/locale';

const TERMS_TOKEN = '__UBP_TERMS__';
const PRIVACY_TOKEN = '__UBP_PRIVACY__';

function openLegal(path: string) {
  void WebBrowser.openBrowserAsync(`${apiBaseUrl()}/${currentLocale()}${path}`, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    toolbarColor: '#172FAB',
    controlsColor: '#FFFFFF',
  });
}

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneTaken, setPhoneTaken] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    setError(null);
    setPhoneTaken(false);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('signup.errorName'));
      return;
    }
    if (trimmedName.split(/\s+/).length < 2) {
      setError(t('signup.errorFullName'));
      return;
    }
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t('login.errorPhone'));
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('signup.errorEmail'));
      return;
    }
    if (!acceptedTerms) {
      setError(t('signup.errorTerms'));
      return;
    }

    setLoading(true);
    try {
      const exists = await checkPhoneExists(normalized.value);
      if (exists) {
        setPhoneTaken(true);
        setError(t('signup.errorPhoneTaken'));
        setLoading(false);
        return;
      }
      await sendOtp(normalized.value);
      const [first, ...rest] = trimmedName.split(/\s+/);
      const last = rest.join(' ');
      router.push({
        pathname: '/(auth)/verify-otp' as const,
        params: {
          phone: normalized.value,
          flow: 'signup',
          firstName: first,
          lastName: last,
          email: email.trim(),
        },
      });
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={{ uri: LAPTOP_IMAGE }} style={styles.headerImage} resizeMode="cover" />
          <View style={styles.headerOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.72)']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headingMain}>{t('signup.headingMain')}</Text>
            <Text style={styles.headingSub}>{t('signup.headingSub')}</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('signup.fullNameLabel')}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder={t('signup.fullNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!loading}
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('signup.phoneLabel')}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                ref={phoneRef}
                style={styles.input}
                placeholder={t('login.phonePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                editable={!loading}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('signup.emailLabel')}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder={t('signup.emailPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!loading}
                onSubmitEditing={handleSignup}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{t('signup.infoBox')}</Text>
          </View>

          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setAcceptedTerms((v) => !v)}
              activeOpacity={0.7}
              disabled={loading}
              hitSlop={8}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxActive,
                ]}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.terms}>
              {(() => {
                const template = t('signup.termsAccept', {
                  terms: TERMS_TOKEN,
                  privacy: PRIVACY_TOKEN,
                });
                const termsLabel = t('signup.termsLink');
                const privacyLabel = t('signup.privacyLink');
                const tokens = [
                  { token: TERMS_TOKEN, label: termsLabel, path: '/legal/terms' },
                  { token: PRIVACY_TOKEN, label: privacyLabel, path: '/legal/privacy' },
                ];
                const nodes: React.ReactNode[] = [];
                let rest = template;
                let key = 0;
                while (rest.length > 0) {
                  const next = tokens
                    .map((t) => ({ ...t, idx: rest.indexOf(t.token) }))
                    .filter((t) => t.idx >= 0)
                    .sort((a, b) => a.idx - b.idx)[0];
                  if (!next) {
                    nodes.push(<Text key={key++}>{rest}</Text>);
                    break;
                  }
                  if (next.idx > 0) {
                    nodes.push(<Text key={key++}>{rest.slice(0, next.idx)}</Text>);
                  }
                  nodes.push(
                    <Text
                      key={key++}
                      style={styles.termsLink}
                      onPress={() => openLegal(next.path)}
                      suppressHighlighting
                    >
                      {next.label}
                    </Text>,
                  );
                  rest = rest.slice(next.idx + next.token.length);
                }
                return nodes;
              })()}
            </Text>
          </View>

          {error && (
            <View>
              <Text style={styles.errorText}>{error}</Text>
              {phoneTaken && (
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/login')}
                  style={styles.errorAction}
                >
                  <Text style={styles.errorActionText}>{t('signup.loginInstead')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.btnText}>{t('signup.submit')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>{t('signup.haveAccount')} </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>{t('signup.logIn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerText: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
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
  form: {
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 18,
  },
  field: {
    gap: 7,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  infoBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  terms: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary,
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: '#D6354A',
  },
  errorAction: {
    paddingTop: 4,
  },
  errorActionText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  loginText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
});
