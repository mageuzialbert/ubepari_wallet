"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useSessionUser, type SessionUser } from "@/lib/use-session-user";

function displayName(user: SessionUser): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return `+${user.phone}`;
}

function initials(user: SessionUser): string {
  const a = user.firstName?.[0];
  const b = user.lastName?.[0];
  if (a || b) return `${a ?? ""}${b ?? ""}`.toUpperCase();
  return user.phone.slice(-2);
}

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const localePrefix = `/${locale}`;
  const { user, loading, signOut } = useSessionUser();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = React.useCallback(async () => {
    await signOut();
    router.push(localePrefix);
    router.refresh();
  }, [signOut, router, localePrefix]);

  const accountItems = [
    { href: "/account", label: dict.header.accountMenu.profile },
    { href: "/account/goals", label: dict.header.accountMenu.orders },
    { href: "/kyc", label: dict.header.accountMenu.kyc },
  ];

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
          aria-label={dict.header.logoLabel}
          className="flex items-center"
        >
          <Logo variant="lockup" size="sm" />
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

          {/* Desktop auth */}
          <div className="hidden items-center gap-1 md:flex">
            {loading ? (
              <div
                aria-hidden
                className="h-8 w-20 animate-pulse rounded-full bg-muted/50"
              />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={dict.header.account}
                    className="ml-1 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-1 py-1 pr-3 text-[13px] transition-colors hover:bg-accent"
                  >
                    <Avatar size="sm">
                      <AvatarFallback className="bg-foreground text-background">
                        {initials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[9rem] truncate tracking-tight">
                      {displayName(user)}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {dict.header.accountMenu.signedInAs}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      +{user.phone}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {accountItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={`${localePrefix}${item.href}`}>
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    {dict.header.accountMenu.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-[13px]"
                >
                  <Link href={`${localePrefix}/signin`}>
                    {dict.header.signIn}
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full text-[13px]">
                  <Link href={`${localePrefix}/signup`}>
                    {dict.header.getStarted}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile */}
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
                <SheetTitle className="text-left">
                  <Logo variant="lockup" size="md" />
                  <span className="sr-only">{dict.header.logoLabel}</span>
                </SheetTitle>
              </SheetHeader>

              {user && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3">
                  <Avatar>
                    <AvatarFallback className="bg-foreground text-background">
                      {initials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {displayName(user)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      +{user.phone}
                    </div>
                  </div>
                </div>
              )}

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

              {user ? (
                <div className="mt-6 flex flex-col gap-1 border-t pt-4">
                  <Link
                    href={`${localePrefix}/account`}
                    className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <User className="mr-2 inline h-4 w-4" />
                    {dict.header.accountMenu.profile}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="mr-2 inline h-4 w-4" />
                    {dict.header.accountMenu.signOut}
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href={`${localePrefix}/signin`}>
                      {dict.header.signIn}
                    </Link>
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link href={`${localePrefix}/signup`}>
                      {dict.header.getStarted}
                    </Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
