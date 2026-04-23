import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieDisclosure } from "@/components/cookie-disclosure";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { hasLocale, locales } from "@/i18n/config";
import { DictionaryProvider } from "@/i18n/provider";
import { getDictionary } from "./dictionaries";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type LayoutParams = Promise<{ locale: string }>;

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1A2FB8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({
  params,
}: {
  params: LayoutParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ubeparipc.tech";
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: dict.meta.siteTitle,
      template: dict.meta.titleTemplate,
    },
    description: dict.meta.siteDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        sw: "/sw",
        "x-default": "/en",
      },
    },
    openGraph: {
      title: dict.meta.siteTitle,
      description: dict.meta.siteDescription,
      url: `${siteUrl}/${locale}`,
      siteName: "Ubepari Wallet",
      locale: locale === "sw" ? "sw_TZ" : "en_TZ",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.siteTitle,
      description: dict.meta.siteDescription,
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icon.png",
      apple: "/apple-icon.png",
      shortcut: "/favicon.ico",
    },
    appleWebApp: {
      capable: true,
      title: "Ubepari",
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: LayoutParams;
}>) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <DictionaryProvider dict={dict} locale={locale}>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter dict={dict.footer} locale={locale} />
            <CookieDisclosure />
            <InstallPrompt />
          </DictionaryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
