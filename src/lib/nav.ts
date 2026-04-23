export type NavKey = "store" | "aiTips" | "goals" | "support";

export type NavItem = { href: string; key: NavKey };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/store", key: "store" },
  { href: "/assistant", key: "aiTips" },
  { href: "/account/goals", key: "goals" },
  { href: "/support", key: "support" },
];
