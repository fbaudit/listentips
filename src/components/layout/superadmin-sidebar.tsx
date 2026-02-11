"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Code,
  CreditCard,
  FileCheck,
  Shield,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, labelKey: "dashboard.title" },
  { href: "/admin/users", icon: Users, labelKey: "users.title" },
  { href: "/admin/companies", icon: Building2, labelKey: "companies.title" },
  { href: "/admin/codes", icon: Code, labelKey: "codes.title" },
  { href: "/admin/subscriptions", icon: CreditCard, labelKey: "subscriptions.title" },
  { href: "/admin/applications", icon: FileCheck, labelKey: "applications.title" },
  { href: "/admin/settings", icon: Settings, labelKey: "settings.title" },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("admin");

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card min-h-screen">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold">Super Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
