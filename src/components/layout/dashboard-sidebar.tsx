"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getCompanyMenuPermissions, type CompanyMenuKey } from "@/lib/auth/company-permissions";
import {
  LayoutDashboard,
  FileText,
  Settings,
  CreditCard,
  Building2,
} from "lucide-react";

const navItems = [
  { key: "dashboard" as CompanyMenuKey, href: "/company/dashboard", icon: LayoutDashboard, labelKey: "dashboard.title" },
  { key: "reports" as CompanyMenuKey, href: "/company/reports", icon: FileText, labelKey: "reports.title" },
  { key: "settings" as CompanyMenuKey, href: "/company/settings", icon: Settings, labelKey: "settings.title" },
  { key: "subscription" as CompanyMenuKey, href: "/company/subscription", icon: CreditCard, labelKey: "subscription.title" },
];

export function DashboardSidebar({ mobile }: { mobile?: boolean } = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations("company");
  const [companyName, setCompanyName] = useState<string | null>(session?.user?.companyName || null);

  useEffect(() => {
    if (session?.user?.companyName) {
      setCompanyName(session.user.companyName);
      return;
    }
    if (!session?.user?.companyId) return;

    fetch("/api/company/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.company?.name) setCompanyName(data.company.name);
      })
      .catch(() => {});
  }, [session?.user?.companyName, session?.user?.companyId]);

  const allowedMenus = getCompanyMenuPermissions(session?.user?.companyRole);
  const filteredItems = navItems.filter((item) => allowedMenus.includes(item.key));

  return (
    <aside className={cn("w-64 flex-col border-r bg-card min-h-screen", mobile ? "flex" : "hidden lg:flex")}>
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="font-bold truncate">{companyName || "Listen"}</span>
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
