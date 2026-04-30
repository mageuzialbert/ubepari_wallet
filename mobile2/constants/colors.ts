// UBEPARI Wallet design system colors
export const Colors = {
  primary: '#172FAB',
  primaryLight: '#2B45C4',
  primaryDark: '#0F1E78',
  secondary: '#52CAFB',
  secondaryLight: '#7DD9FC',
  secondaryDark: '#29B6F6',

  white: '#FFFFFF',
  black: '#000000',

  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF2FA',

  textPrimary: '#0D1333',
  textSecondary: '#5A6478',
  textMuted: '#9BA5BB',
  textOnPrimary: '#FFFFFF',

  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  border: '#E2E8F2',
  borderLight: '#EFF2FA',

  shadow: 'rgba(23,47,171,0.10)',
  overlay: 'rgba(0,0,0,0.45)',

  cardGradientStart: '#172FAB',
  cardGradientEnd: '#52CAFB',
} as const;

export type ColorKey = keyof typeof Colors;
