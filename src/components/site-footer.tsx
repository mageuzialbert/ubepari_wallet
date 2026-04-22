import Link from "next/link";

import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";

type FooterDict = Dictionary["footer"];

type FooterLink = { href: string; labelKey: string; external?: boolean };
type FooterGroup = { titleKey: keyof FooterDict; links: FooterLink[] };

const GROUPS: FooterGroup[] = [
  {
    titleKey: "shop",
    links: [
      { href: "/store", labelKey: "allPcs" },
      { href: "/store?usage=Gaming", labelKey: "gaming" },
      { href: "/store?usage=Design", labelKey: "design" },
      { href: "/store?usage=Student", labelKey: "students" },
    ],
  },
  {
    titleKey: "wallet",
    links: [
      { href: "/wallet", labelKey: "myWallet" },
      { href: "/wallet/top-up", labelKey: "topUp" },
      { href: "/orders", labelKey: "orders" },
      { href: "/kyc", labelKey: "kyc" },
    ],
  },
  {
    titleKey: "company",
    links: [
      { href: "/about", labelKey: "about" },
      { href: "/support", labelKey: "support" },
      { href: "/referrals", labelKey: "referrals" },
      { href: "https://wa.me/255000000000", labelKey: "whatsapp", external: true },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { href: "/legal/terms", labelKey: "terms" },
      { href: "/legal/hire-purchase-agreement", labelKey: "hirePurchase" },
      { href: "/legal/privacy", labelKey: "privacy" },
    ],
  },
];

export function SiteFooter({ dict, locale }: { dict: FooterDict; locale: Locale }) {
  const year = new Date().getFullYear();
  const copyright = dict.copyright.replace("{year}", String(year));
  const localize = (href: string, external?: boolean) =>
    external ? href : `/${locale}${href}`;

  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {GROUPS.map((group) => {
            const groupDict = dict[group.titleKey] as Record<string, string>;
            return (
              <div key={group.titleKey}>
                <h4 className="text-[11px] font-semibold tracking-wider text-foreground uppercase">
                  {groupDict.title}
                </h4>
                <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={localize(link.href, link.external)}
                        className="transition-colors hover:text-foreground"
                      >
                        {groupDict[link.labelKey]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <p>{copyright}</p>
          <p>{dict.legalNote}</p>
        </div>
      </div>
    </footer>
  );
}
