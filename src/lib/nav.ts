export type NavKey = "store" | "aiTips" | "goals" | "wallet" | "support";

export type NavItem = { href: string; key: NavKey };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/store", key: "store" },
  { href: "/assistant", key: "aiTips" },
  { href: "/account/goals", key: "goals" },
  { href: "/wallet", key: "wallet" },
  { href: "/support", key: "support" },
];
