import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./en.json";
import sw from "./sw.json";
import { defaultLocale, hasLocale, type Locale } from "./config";

const STORAGE_KEY = "ubepari.locale.v1";

function detectDeviceLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageTag ?? "";
  const short = tag.split("-")[0]?.toLowerCase() ?? "";
  return hasLocale(short) ? short : defaultLocale;
}

export async function initI18n(): Promise<Locale> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const locale: Locale = stored && hasLocale(stored) ? stored : detectDeviceLocale();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      sw: { translation: sw },
    },
    lng: locale,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: "v4",
  });

  return locale;
}

export async function setLocale(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, locale);
  await i18n.changeLanguage(locale);
}

export function currentLocale(): Locale {
  const lng = i18n.language;
  return hasLocale(lng) ? lng : defaultLocale;
}

export default i18n;
