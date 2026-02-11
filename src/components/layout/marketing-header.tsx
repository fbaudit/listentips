"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./language-switcher";

export function MarketingHeader() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: `/${locale}#features`, label: t("features"), isAnchor: true },
    { href: `/${locale}#pricing`, label: t("pricing"), isAnchor: true },
    { href: "/apply", label: t("apply"), isAnchor: false },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl" aria-label="홈">
          <Shield className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">모두의 제보채널</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) =>
            item.isAnchor ? (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/company/login" className="hidden md:block">
            <Button variant="outline" size="sm">{t("companyLogin")}</Button>
          </Link>
          <Link href="/apply" className="hidden md:block">
            <Button size="sm">{t("apply")}</Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) =>
                  item.isAnchor ? (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-lg font-medium hover:text-primary"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-lg font-medium hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  )
                )}
                <hr />
                <Link href="/company/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">{t("companyLogin")}</Button>
                </Link>
                <Link href="/apply" onClick={() => setOpen(false)}>
                  <Button className="w-full">{t("apply")}</Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
