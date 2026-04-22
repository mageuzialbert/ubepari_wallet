"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  Users,
  ShoppingBag,
  Banknote,
  BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/provider";

type AdminNavCopy = {
  dashboard: string;
  kyc: string;
  products: string;
  users: string;
  orders: string;
  payments: string;
  reports: string;
  comingSoon: string;
};

type Item = {
  key: keyof Omit<AdminNavCopy, "comingSoon">;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const ITEMS: Item[] = [
  { key: "dashboard", href: "", icon: LayoutDashboard, enabled: true },
  { key: "kyc", href: "/kyc", icon: ShieldCheck, enabled: true },
  { key: "products", href: "/products", icon: Package, enabled: true },
  { key: "users", href: "/users", icon: Users, enabled: true },
  { key: "orders", href: "/orders", icon: ShoppingBag, enabled: true },
  { key: "payments", href: "/payments", icon: Banknote, enabled: true },
  { key: "reports", href: "/reports", icon: BarChart3, enabled: false },
];

export function AdminSidebar({ nav }: { nav: AdminNavCopy }) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const href = `/${locale}/admin${item.href}`;
        const active =
          item.href === ""
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        if (!item.enabled) {
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-full px-4 py-2 text-[13px] text-muted-foreground/60"
              aria-disabled="true"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {nav[item.key]}
              </span>
              <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                {nav.comingSoon}
              </span>
            </div>
          );
        }

        return (
          <Link
            key={item.key}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-2 text-[13px] transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {nav[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
