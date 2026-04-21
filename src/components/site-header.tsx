"use client";

import Link from "next/link";
import { Menu, Wallet2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { PRIMARY_NAV } from "@/lib/nav";
import { useDictionary, useLocale } from "@/i18n/provider";

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const dict = useDictionary();
  const locale = useLocale();
  const localePrefix = `/${locale}`;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-200 ${
        scrolled
          ? "border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-transparent bg-background/40 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href={localePrefix}
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-foreground to-foreground/70 text-background">
            <Wallet2 className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          Ubepari
          <span className="text-muted-foreground">Wallet</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 text-[13px] text-muted-foreground md:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={`${localePrefix}${item.href}`}
              className="transition-colors hover:text-foreground"
            >
              {dict.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <LocaleToggle />
          <ThemeToggle />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden rounded-full text-[13px] md:inline-flex"
          >
            <Link href={`${localePrefix}/signin`}>{dict.header.signIn}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden rounded-full text-[13px] md:inline-flex"
          >
            <Link href={`${localePrefix}/signup`}>{dict.header.getStarted}</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full md:hidden"
                aria-label={dict.header.openMenu}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetHeader className="p-0">
                <SheetTitle className="text-left">{dict.header.logoLabel}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {PRIMARY_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={`${localePrefix}${item.href}`}
                    className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    {dict.nav[item.key]}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild variant="outline" className="rounded-full">
                  <Link href={`${localePrefix}/signin`}>{dict.header.signIn}</Link>
                </Button>
                <Button asChild className="rounded-full">
                  <Link href={`${localePrefix}/signup`}>{dict.header.getStarted}</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
