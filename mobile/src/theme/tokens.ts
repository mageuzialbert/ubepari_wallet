// JS-accessible mirror of the OKLCH tokens for places that can't use Tailwind classes
// (e.g. react-native-svg stroke colors, bottom-sheet handle colors, confetti palette).

export const brand = {
  blue: "oklch(0.32 0.22 267)",
  cyan: "oklch(0.78 0.14 232)",
  // Hex fallbacks for APIs that don't parse oklch
  blueHex: "#1A2FB8",
  cyanHex: "#5B8DEF",
};

export const semantic = {
  destructiveHex: "#E74C3C",
  successHex: "#22C55E",
  warningHex: "#F59E0B",
};

export const palette = {
  light: {
    background: "#FFFFFF",
    foreground: "#1A1A1A",
    card: "#FFFFFF",
    muted: "#F7F7F7",
    mutedForeground: "#8E8E93",
    border: "#ECECEC",
    primary: brand.blueHex,
    primaryForeground: "#FFFFFF",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#FAFAFA",
    card: "#1a1a1a",
    muted: "#2a2a2a",
    mutedForeground: "#AAAAAA",
    border: "rgba(255,255,255,0.1)",
    primary: brand.cyanHex,
    primaryForeground: "#0A1240",
  },
};
