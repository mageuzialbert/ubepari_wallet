export type NavKey = "store" | "aiTips" | "wallet" | "orders" | "support";

export type NavItem = { href: string; key: NavKey };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/store", key: "store" },
  { href: "/recommend", key: "aiTips" },
  { href: "/wallet", key: "wallet" },
  { href: "/orders", key: "orders" },
  { href: "/support", key: "support" },
];
