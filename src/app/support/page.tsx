import Link from "next/link";
import { MessageCircle, Phone, Mail, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Support",
};

const CHANNELS = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Fastest. Your order ID gets pre-filled.",
    cta: "Message us",
    href: "https://wa.me/255000000000?text=Hi%20Ubepari%2C%20I%20need%20help%20with%20my%20order",
  },
  {
    icon: Phone,
    title: "Call us",
    description: "Mon–Sat, 9 AM – 6 PM EAT.",
    cta: "+255 000 000 000",
    href: "tel:+255000000000",
  },
  {
    icon: Mail,
    title: "Email",
    description: "Best for warranty & documentation.",
    cta: "support@ubepari.co.tz",
    href: "mailto:support@ubepari.co.tz",
  },
];

const FAQS = [
  {
    q: "How does hire-purchase work?",
    a: "You pay 20% today and own the PC immediately. The balance is split over 3, 6, 9, or 12 months — paid through your Ubepari Wallet via mobile money or card.",
  },
  {
    q: "What happens if I miss a payment?",
    a: "A 2% late fee applies after 7 days. Your PC is never repossessed without written notice and a 30-day grace window.",
  },
  {
    q: "Can I pay the balance off early?",
    a: "Yes, and there's no fee for doing so. Early payoff may also unlock credit-point rewards.",
  },
  {
    q: "Which payment providers work with Ubepari?",
    a: "M-Pesa, Tigo Pesa, Airtel Money, and Visa / Mastercard — all processed through Evmark's certified gateway.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Support
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          A real person, every time.
        </h1>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-3xl border border-border/60 bg-card p-6 transition-all hover:border-border hover:shadow-sm"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <h3 className="mt-4 text-[15px] font-semibold">{c.title}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {c.description}
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium">
                {c.cta}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </p>
            </Link>
          );
        })}
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Frequently asked
        </h2>
        <ul className="mt-6 divide-y divide-border/60 rounded-3xl border border-border/60 bg-card">
          {FAQS.map((f) => (
            <li key={f.q} className="p-6">
              <p className="font-medium">{f.q}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
