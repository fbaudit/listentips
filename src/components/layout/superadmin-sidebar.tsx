"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Code,
  CreditCard,
  FileCheck,
  Shield,
  Settings,
} from "lucide-react";

const navItems = [
  { key: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard, labelKey: "dashboard.title" },
  { key: "users", href: "/admin/users", icon: Users, labelKey: "users.title" },
  { key: "companies", href: "/admin/companies", icon: Building2, labelKey: "companies.title" },
  { key: "reports", href: "/admin/reports", icon: FileText, labelKey: "reports.title" },
  { key: "codes", href: "/admin/codes", icon: Code, labelKey: "codes.title" },
  { key: "subscriptions", href: "/admin/subscriptions", icon: CreditCard, labelKey: "subscriptions.title" },
  { key: "applications", href: "/admin/applications", icon: FileCheck, labelKey: "applications.title" },
  { key: "settings", href: "/admin/settings", icon: Settings, labelKey: "settings.title" },
];

interface SuperAdminSidebarProps {
  allowedMenus?: string[];
}

export function SuperAdminSidebar({ allowedMenus }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("admin");

  const filteredItems = allowedMenus
    ? navItems.filter((item) => allowedMenus.includes(item.key))
    : navItems;

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card min-h-screen">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold">Super Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
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
