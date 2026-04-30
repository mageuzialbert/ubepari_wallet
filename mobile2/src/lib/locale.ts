// Compatibility shim — locale primitives now live in @/i18n.
export {
  initI18n as loadLocale,
  currentLocale,
  setLocale,
  onLocaleChange,
  t,
  type Locale,
} from '@/i18n';
