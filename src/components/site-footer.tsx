import Link from "next/link";

const FOOTER_GROUPS = [
  {
    title: "Shop",
    links: [
      { href: "/store", label: "All PCs" },
      { href: "/store?usage=Gaming", label: "Gaming" },
      { href: "/store?usage=Design", label: "Design & Creators" },
      { href: "/store?usage=Student", label: "Students" },
    ],
  },
  {
    title: "Wallet",
    links: [
      { href: "/wallet", label: "My Wallet" },
      { href: "/wallet/top-up", label: "Top up" },
      { href: "/orders", label: "Orders & Schedule" },
      { href: "/kyc", label: "KYC & Verification" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Ubepari" },
      { href: "/support", label: "Support" },
      { href: "/referrals", label: "Referral Program" },
      { href: "https://wa.me/255000000000", label: "WhatsApp" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/hire-purchase", label: "Hire-Purchase Agreement" },
      { href: "/legal/privacy", label: "Privacy Policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="text-[11px] font-semibold tracking-wider text-foreground uppercase">
                {group.title}
              </h4>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Ubepari PC. Built in Dar es Salaam.
          </p>
          <p>
            Credit facility operated by Ubepari PC. Hire-purchase regulated
            under Tanzanian consumer-finance law.
          </p>
        </div>
      </div>
    </footer>
  );
}
