"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Shield } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./language-switcher";

export function MarketingHeader() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl" aria-label="홈">
          <Shield className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">모두의 제보채널 Listen</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/company/login">
              <Button variant="outline" size="sm">{t("companyLogin")}</Button>
            </Link>
            <Link href="/apply">
              <Button size="sm">무료체험</Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/company/login" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">{t("companyLogin")}</Button>
                </Link>
                <Link href="/apply" onClick={() => setOpen(false)}>
                  <Button className="w-full">무료체험</Button>
                </Link>
                <div className="flex justify-center mt-2">
                  <LanguageSwitcher />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
