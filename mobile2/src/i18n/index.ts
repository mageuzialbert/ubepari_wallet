import '@formatjs/intl-getcanonicallocales/polyfill';
import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/locale-data/en';
import '@formatjs/intl-pluralrules/locale-data/sw';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import sw from './sw.json';

export type Locale = 'en' | 'sw';
const VALID_LOCALES: Locale[] = ['en', 'sw'];
const STORAGE_KEY = 'ubepari.locale.v1';

const listeners = new Set<(locale: Locale) => void>();

function detectDeviceLocale(): Locale {
  try {
    const tag = Localization.getLocales()[0]?.languageTag ?? '';
    const short = tag.split('-')[0]?.toLowerCase() ?? '';
    return (VALID_LOCALES as string[]).includes(short) ? (short as Locale) : 'en';
  } catch {
    return 'en';
  }
}

let initialized = false;

export async function initI18n(): Promise<Locale> {
  if (initialized) return currentLocale();

  let locale: Locale = 'en';
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && (VALID_LOCALES as string[]).includes(stored)) {
      locale = stored as Locale;
    } else {
      locale = detectDeviceLocale();
    }
  } catch {
    locale = detectDeviceLocale();
  }

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      sw: { translation: sw },
    },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });

  initialized = true;
  return locale;
}

export function currentLocale(): Locale {
  const lng = i18n.language;
  return (VALID_LOCALES as string[]).includes(lng) ? (lng as Locale) : 'en';
}

export async function setLocale(next: Locale): Promise<void> {
  await i18n.changeLanguage(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // best-effort
  }
  for (const fn of listeners) fn(next);
}

export function onLocaleChange(fn: (locale: Locale) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Translate outside of a React component (helpers, error mappers). */
export function t(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params) as string;
}

export default i18n;
